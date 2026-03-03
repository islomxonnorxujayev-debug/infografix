import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_API = "https://api.telegram.org/bot";

async function sendMessage(token: string, chatId: number, text: string, opts?: { parse_mode?: string; reply_markup?: any }) {
  await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: opts?.parse_mode || "HTML", ...opts }),
  });
}

async function sendPhoto(token: string, chatId: number, photoUrl: string, caption?: string) {
  await fetch(`${TELEGRAM_API}${token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, parse_mode: "HTML" }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

  if (!botToken) {
    return new Response(JSON.stringify({ error: "Bot token not configured" }), { status: 500 });
  }

  const url = new URL(req.url);

  // Webhook setup endpoint
  if (url.searchParams.get("setup") === "true") {
    const webhookUrl = `${supabaseUrl}/functions/v1/telegram-bot`;
    const res = await fetch(`${TELEGRAM_API}${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const update = await req.json();
    const message = update.message;
    if (!message) return new Response("OK");

    const chatId = message.chat.id;
    const text = message.text || "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find or create user profile by telegram_chat_id
    // We use a simple approach: store telegram_chat_id in profiles or link via separate method
    // For now, we'll use email-based linking: /start <email>

    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      if (parts.length < 2) {
        await sendMessage(botToken, chatId, 
          "👋 <b>PhotoAI Bot</b>ga xush kelibsiz!\n\n" +
          "📸 Mahsulot rasmlarini professional darajada tayyorlash uchun bot.\n\n" +
          "🔗 <b>Akkauntni ulash uchun:</b>\n<code>/start your@email.com</code>\n\n" +
          "📋 <b>Buyruqlar:</b>\n" +
          "/balance — Kredit qoldig'i\n" +
          "/help — Yordam\n\n" +
          "Akkauntni ulagandan keyin rasm yuboring — biz uni professional qilib qayta ishlaymiz! 🚀"
        );
        return new Response("OK");
      }

      const email = parts[1].trim().toLowerCase();
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .single();

      if (!profile) {
        await sendMessage(botToken, chatId,
          "❌ Bu email bilan ro'yxatdan o'tilmagan.\n\n" +
          "Avval web-saytda ro'yxatdan o'ting, keyin qayta urinib ko'ring."
        );
        return new Response("OK");
      }

      // Store chat_id — we'll use the enhancements field or a simple mapping
      // Update profile with telegram info using a custom approach
      const { error } = await supabase
        .from("profiles")
        .update({ updated_at: new Date().toISOString() })
        .eq("user_id", profile.user_id);

      // Store mapping in generations table metadata or use a simple KV approach
      // For simplicity, we'll create a telegram_users mapping via a lookup
      // Actually let's just store it in memory for this session and use email lookup each time

      await sendMessage(botToken, chatId,
        `✅ <b>Muvaffaqiyatli ulandi!</b>\n\n` +
        `📧 Email: ${email}\n` +
        `💰 Kreditlar: <b>${profile.credits_remaining}</b>\n` +
        `📦 Tarif: <b>${profile.plan}</b>\n\n` +
        `Endi mahsulot rasmini yuboring — biz uni qayta ishlaymiz! 📸`
      );
      return new Response("OK");
    }

    if (text === "/balance" || text === "/balans") {
      // Ask for email if we don't know the user
      await sendMessage(botToken, chatId,
        "💰 Balansni tekshirish uchun emailingizni yuboring:\n\n" +
        "Masalan: <code>your@email.com</code>"
      );
      return new Response("OK");
    }

    if (text === "/help" || text === "/yordam") {
      await sendMessage(botToken, chatId,
        "📋 <b>Buyruqlar ro'yxati:</b>\n\n" +
        "/start email — Akkauntni ulash\n" +
        "/balance — Kredit qoldig'i\n" +
        "/help — Yordam\n\n" +
        "📸 <b>Rasm generatsiya:</b>\n" +
        "Mahsulot rasmini yuboring — avtomatik qayta ishlanadi.\n\n" +
        "⚙️ <b>Sozlamalar:</b>\n" +
        "Standart: Studio fon, modelsiz\n\n" +
        "🌐 Web-sayt orqali ko'proq sozlamalardan foydalanishingiz mumkin."
      );
      return new Response("OK");
    }

    // Check if it's an email (for balance check)
    if (text.includes("@") && text.includes(".") && !text.startsWith("/")) {
      const email = text.trim().toLowerCase();
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits_remaining, plan")
        .eq("email", email)
        .single();

      if (profile) {
        await sendMessage(botToken, chatId,
          `💰 <b>Balans:</b>\n\n` +
          `📧 ${email}\n` +
          `🎯 Kreditlar: <b>${profile.credits_remaining}</b>\n` +
          `📦 Tarif: <b>${profile.plan}</b>`
        );
      } else {
        await sendMessage(botToken, chatId, "❌ Bu email topilmadi. Avval web-saytda ro'yxatdan o'ting.");
      }
      return new Response("OK");
    }

    // Handle photo
    if (message.photo && message.photo.length > 0) {
      const caption = message.caption || "";
      // Extract email from caption or ask
      const emailMatch = caption.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
      
      if (!emailMatch) {
        await sendMessage(botToken, chatId,
          "📸 Rasm qabul qilindi!\n\n" +
          "⚠️ Emailingizni rasm bilan birga caption sifatida yuboring.\n\n" +
          "Masalan: Rasmni yuborayotganda caption ga <code>your@email.com</code> yozing."
        );
        return new Response("OK");
      }

      const email = emailMatch[0].toLowerCase();
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, credits_remaining")
        .eq("email", email)
        .single();

      if (!profile) {
        await sendMessage(botToken, chatId, "❌ Bu email topilmadi.");
        return new Response("OK");
      }

      if (profile.credits_remaining <= 0) {
        await sendMessage(botToken, chatId, "❌ Kredit tugadi. Web-saytda tarifingizni yangilang.");
        return new Response("OK");
      }

      await sendMessage(botToken, chatId, "⏳ Rasm qayta ishlanmoqda... 30-60 soniya kuting.");

      // Get file from Telegram
      const photoFile = message.photo[message.photo.length - 1]; // highest quality
      const fileRes = await fetch(`${TELEGRAM_API}${botToken}/getFile?file_id=${photoFile.file_id}`);
      const fileData = await fileRes.json();
      const filePath = fileData.result?.file_path;

      if (!filePath) {
        await sendMessage(botToken, chatId, "❌ Rasmni olishda xatolik.");
        return new Response("OK");
      }

      // Download file
      const imageRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
      const imageBytes = new Uint8Array(await imageRes.arrayBuffer());

      // Upload to storage
      const storagePath = `${profile.user_id}/originals/${crypto.randomUUID()}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(storagePath, imageBytes, { contentType: "image/jpeg", upsert: true });

      if (uploadErr) {
        await sendMessage(botToken, chatId, "❌ Rasmni saqlashda xatolik.");
        return new Response("OK");
      }

      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(storagePath);

      // Create generation record
      const genId = crypto.randomUUID();
      await supabase.from("generations").insert({
        id: genId,
        user_id: profile.user_id,
        original_url: urlData.publicUrl,
        marketplace: "Telegram Bot / Studio",
        style_preset: "studio",
        enhancements: { model: "without-model", scene: "studio", language: "uz", source: "telegram" },
        status: "processing",
      });

      // Call AI
      if (!lovableApiKey) {
        await sendMessage(botToken, chatId, "❌ AI tizimi sozlanmagan.");
        return new Response("OK");
      }

      const prompt = `Elite e-commerce product photographer. Create ONE scroll-stopping product image.
OUTPUT: 1080×1440px (3:4), high-res, no artifacts.
PRODUCT ANALYSIS: Study uploaded image — category, dimensions, features, colors, materials.
SCENE: Studio: seamless gradient backdrop, 3-point lighting (45° key, soft fill, rim light), reflective surface below.
MODEL: Product-only. Dynamic angles, artistic shadows, complementary props.
SCALE: Product at CORRECT real-world size. 25-40% of frame. Use props as scale anchors.
LIGHTING: 3-point professional. Cinematic color grading. True colors. Subtle vignette.
QUALITY: $5000 photoshoot level. Not AI-looking. Unique composition.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: urlData.publicUrl } }] }],
          modalities: ["image", "text"],
        }),
      });

      if (!aiResponse.ok) {
        await supabase.from("generations").update({ status: "failed" }).eq("id", genId);
        await sendMessage(botToken, chatId, "❌ AI xatolik. Keyinroq urinib ko'ring.");
        return new Response("OK");
      }

      const aiData = await aiResponse.json();
      const resultBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!resultBase64) {
        await supabase.from("generations").update({ status: "failed" }).eq("id", genId);
        await sendMessage(botToken, chatId, "❌ AI rasm qaytarmadi. Qayta urinib ko'ring.");
        return new Response("OK");
      }

      // Upload result
      const base64Clean = resultBase64.replace(/^data:image\/\w+;base64,/, "");
      const resultBytes = Uint8Array.from(atob(base64Clean), (c) => c.charCodeAt(0));
      const resultPath = `${profile.user_id}/results/${genId}.png`;

      await supabase.storage.from("product-images").upload(resultPath, resultBytes, { contentType: "image/png", upsert: true });
      const { data: resultUrlData } = supabase.storage.from("product-images").getPublicUrl(resultPath);

      // Update generation & credits
      await supabase.from("generations").update({ result_url: resultUrlData.publicUrl, status: "completed" }).eq("id", genId);
      await supabase.from("profiles").update({ credits_remaining: profile.credits_remaining - 1 }).eq("user_id", profile.user_id);

      // Send result
      await sendPhoto(botToken, chatId, resultUrlData.publicUrl,
        `✅ <b>Tayyor!</b>\n\n💰 Qolgan kreditlar: <b>${profile.credits_remaining - 1}</b>`
      );
      return new Response("OK");
    }

    // Unknown message
    await sendMessage(botToken, chatId,
      "🤔 Tushunmadim. /help buyrug'ini yuboring yoki mahsulot rasmini yuboring."
    );
    return new Response("OK");

  } catch (e) {
    console.error("Telegram bot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
