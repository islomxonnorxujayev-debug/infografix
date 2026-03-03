import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_API = "https://api.telegram.org/bot";
const CARD_NUMBER = "9860 1606 0533 5993";
const WEB_APP_URL = "https://infografix.lovable.app";

const PACKAGES = [
  { key: "1", name: "1 ta rasm", credits: 1, price: "4 999 so'm" },
  { key: "10", name: "10 ta rasm", credits: 10, price: "45 000 so'm (-10%)" },
  { key: "15", name: "15 ta rasm", credits: 15, price: "55 000 so'm (-27%)" },
  { key: "20", name: "20 ta rasm", credits: 20, price: "65 000 so'm (-35%) ⭐" },
  { key: "50", name: "50 ta rasm", credits: 50, price: "149 000 so'm (-40%)" },
  { key: "100", name: "100 ta rasm", credits: 100, price: "249 999 so'm (-50%)" },
];

const AMOUNTS: Record<string, string> = {
  "1": "4999", "10": "45000", "15": "55000", "20": "65000", "50": "149000", "100": "249999",
};

async function sendMessage(token: string, chatId: number, text: string, opts?: any) {
  await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...opts }),
  });
}

async function sendPhoto(token: string, chatId: number, photoUrl: string, caption?: string) {
  await fetch(`${TELEGRAM_API}${token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, parse_mode: "HTML" }),
  });
}

async function getOrCreateProfile(supabase: any, telegramId: number, username?: string, firstName?: string) {
  // Try to find existing profile
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("telegram_id", telegramId)
    .single();

  if (existing) {
    // Update username/first_name if changed
    if (username !== existing.telegram_username || firstName !== existing.first_name) {
      await supabase.from("profiles").update({
        telegram_username: username || existing.telegram_username,
        first_name: firstName || existing.first_name,
      }).eq("id", existing.id);
    }
    return existing;
  }

  // Create new profile
  const { data: newProfile, error } = await supabase
    .from("profiles")
    .insert({
      telegram_id: telegramId,
      telegram_username: username || null,
      first_name: firstName || null,
      credits_remaining: 1, // 1 bepul rasm
      plan: "free",
    })
    .select()
    .single();

  if (error) {
    console.error("Profile creation error:", error);
    return null;
  }
  return newProfile;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

  if (!botToken) return new Response(JSON.stringify({ error: "Bot token not configured" }), { status: 500 });

  const url = new URL(req.url);

  // Webhook setup
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
    const telegramId = message.from.id;
    const username = message.from.username;
    const firstName = message.from.first_name;
    const text = message.text || "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auto-register / find user
    const profile = await getOrCreateProfile(supabase, telegramId, username, firstName);
    if (!profile) {
      await sendMessage(botToken, chatId, "❌ Xatolik yuz berdi. Qayta urinib ko'ring.");
      return new Response("OK");
    }

    // === /start ===
    if (text.startsWith("/start")) {
      const isNew = profile.credits_remaining === 1 && profile.plan === "free";
      await sendMessage(botToken, chatId,
        `👋 <b>Infografix AI</b>ga xush kelibsiz${firstName ? `, ${firstName}` : ""}!\n\n` +
        `📸 Mahsulot rasmlarini professional darajada tayyorlash uchun bot.\n\n` +
        `💰 Balans: <b>${profile.credits_remaining}</b> ta rasm\n` +
        (isNew ? `🎁 Sizga 1 ta bepul rasm berildi!\n\n` : "\n") +
        `📋 <b>Buyruqlar:</b>\n` +
        `/generate — Rasm yaratish (rasm yuboring)\n` +
        `/balance — Balansni ko'rish\n` +
        `/buy — Kredit sotib olish\n` +
        `/help — Yordam\n\n` +
        `Mahsulot rasmini yuboring — biz uni professional qilib qayta ishlaymiz! 🚀`
      );
      return new Response("OK");
    }

    // === /balance ===
    if (text === "/balance" || text === "/balans") {
      await sendMessage(botToken, chatId,
        `💰 <b>Balans</b>\n\n` +
        `👤 ${firstName || username || "Foydalanuvchi"}\n` +
        `🎯 Kreditlar: <b>${profile.credits_remaining}</b> ta rasm\n\n` +
        (profile.credits_remaining <= 0
          ? `❌ Kredit tugadi. /buy buyrug'i bilan sotib oling.`
          : `📸 Rasm yuboring — qayta ishlaymiz!`)
      );
      return new Response("OK");
    }

    // === /buy ===
    if (text === "/buy" || text === "/sotib") {
      let packageList = "🛒 <b>Paketlar:</b>\n\n";
      for (const pkg of PACKAGES) {
        packageList += `/${pkg.key === "1" ? "buy1" : "buy" + pkg.key} — ${pkg.name} • ${pkg.price}\n`;
      }
      packageList += `\n💡 Ko'proq olsangiz — arzonroq!\n`;
      packageList += `Masalan: /buy20 — 20 ta rasm sotib olish`;

      await sendMessage(botToken, chatId, packageList);
      return new Response("OK");
    }

    // === /buy{N} - specific package ===
    const buyMatch = text.match(/^\/buy(\d+)$/);
    if (buyMatch) {
      const pkgKey = buyMatch[1];
      const pkg = PACKAGES.find(p => p.key === pkgKey);

      if (!pkg) {
        await sendMessage(botToken, chatId, "❌ Bunday paket topilmadi. /buy buyrug'ini yuboring.");
        return new Response("OK");
      }

      // Set bot_state to awaiting screenshot
      await supabase.from("profiles").update({
        bot_state: `awaiting_payment:${pkg.key}:${pkg.credits}:${AMOUNTS[pkg.key]}`,
      }).eq("id", profile.id);

      await sendMessage(botToken, chatId,
        `📦 <b>${pkg.name}</b> • ${pkg.price}\n\n` +
        `💳 Quyidagi karta raqamga o'tkazing:\n\n` +
        `<code>${CARD_NUMBER}</code>\n` +
        `👆 <i>Bosib nusxa oling</i>\n\n` +
        `💵 Summa: <b>${pkg.price}</b>\n\n` +
        `📸 To'lov qilganingizdan keyin <b>skrinshot yuboring</b> — biz tekshirib kreditlarni qo'shamiz.\n\n` +
        `❌ Bekor qilish: /cancel`
      );
      return new Response("OK");
    }

    // === /cancel ===
    if (text === "/cancel" || text === "/bekor") {
      if (profile.bot_state) {
        await supabase.from("profiles").update({ bot_state: null }).eq("id", profile.id);
        await sendMessage(botToken, chatId, "✅ Bekor qilindi.");
      } else {
        await sendMessage(botToken, chatId, "ℹ️ Bekor qiladigan narsa yo'q.");
      }
      return new Response("OK");
    }

    // === /help ===
    if (text === "/help" || text === "/yordam") {
      await sendMessage(botToken, chatId,
        `📋 <b>Buyruqlar:</b>\n\n` +
        `📸 Rasm yuboring — professional qayta ishlash\n` +
        `/balance — Kredit qoldig'i\n` +
        `/buy — Kredit sotib olish\n` +
        `/cancel — Sotib olishni bekor qilish\n` +
        `/help — Yordam\n\n` +
        `🎨 <b>Qanday ishlaydi?</b>\n` +
        `1. Mahsulot rasmini yuboring\n` +
        `2. AI uni professional studio sifatida qayta ishlaydi\n` +
        `3. Tayyor rasmni yuklab oling!\n\n` +
        `💡 Har bir rasm uchun 1 kredit sarflanadi.`
      );
      return new Response("OK");
    }

    // === Handle photo ===
    if (message.photo && message.photo.length > 0) {
      // Check if awaiting payment screenshot
      if (profile.bot_state && profile.bot_state.startsWith("awaiting_payment:")) {
        const parts = profile.bot_state.split(":");
        const pkgKey = parts[1];
        const credits = parseInt(parts[2]);
        const amount = parts[3];
        const pkg = PACKAGES.find(p => p.key === pkgKey);

        // Download screenshot
        const photoFile = message.photo[message.photo.length - 1];
        const fileRes = await fetch(`${TELEGRAM_API}${botToken}/getFile?file_id=${photoFile.file_id}`);
        const fileData = await fileRes.json();
        const filePath = fileData.result?.file_path;

        if (!filePath) {
          await sendMessage(botToken, chatId, "❌ Rasmni olishda xatolik. Qayta yuboring.");
          return new Response("OK");
        }

        const imageRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
        const imageBytes = new Uint8Array(await imageRes.arrayBuffer());

        // Upload screenshot to storage
        const storagePath = `payments/${telegramId}/${crypto.randomUUID()}.jpg`;
        await supabase.storage.from("product-images").upload(storagePath, imageBytes, {
          contentType: "image/jpeg", upsert: true,
        });
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(storagePath);

        // Create payment request
        await supabase.from("payment_requests").insert({
          user_id: profile.user_id || null,
          telegram_id: telegramId,
          profile_id: profile.id,
          package_name: pkg?.name || `${credits} ta rasm`,
          credits,
          amount,
          screenshot_url: urlData.publicUrl,
          status: "pending",
        });

        // Clear bot state
        await supabase.from("profiles").update({ bot_state: null }).eq("id", profile.id);

        await sendMessage(botToken, chatId,
          `✅ <b>To'lov so'rovi qabul qilindi!</b>\n\n` +
          `📦 Paket: ${pkg?.name || credits + " ta rasm"}\n` +
          `💵 Summa: ${amount} so'm\n\n` +
          `⏳ Admin tekshirib, kreditlarni qo'shadi.\n` +
          `Odatda 5-30 daqiqa ichida tasdiqlanadi.`
        );
        return new Response("OK");
      }

      // Normal photo — process as product image
      if (profile.credits_remaining <= 0) {
        await sendMessage(botToken, chatId,
          `❌ Kredit tugadi!\n\n💰 Balans: <b>0</b>\n\n/buy buyrug'i bilan kredit sotib oling.`
        );
        return new Response("OK");
      }

      await sendMessage(botToken, chatId, "⏳ Rasm qayta ishlanmoqda... 30-60 soniya kuting.");

      // Get file from Telegram
      const photoFile = message.photo[message.photo.length - 1];
      const fileRes = await fetch(`${TELEGRAM_API}${botToken}/getFile?file_id=${photoFile.file_id}`);
      const fileData = await fileRes.json();
      const filePath = fileData.result?.file_path;

      if (!filePath) {
        await sendMessage(botToken, chatId, "❌ Rasmni olishda xatolik.");
        return new Response("OK");
      }

      const imageRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
      const imageBytes = new Uint8Array(await imageRes.arrayBuffer());

      // Upload to storage
      const storagePath = `${profile.id}/originals/${crypto.randomUUID()}.jpg`;
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
        user_id: profile.user_id || null,
        telegram_id: telegramId,
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
        const status = aiResponse.status;
        if (status === 429) {
          await sendMessage(botToken, chatId, "⏳ AI band. 1-2 daqiqadan keyin qayta yuboring.");
        } else {
          await sendMessage(botToken, chatId, "❌ AI xatolik. Keyinroq urinib ko'ring.");
        }
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
      const resultPath = `${profile.id}/results/${genId}.png`;

      await supabase.storage.from("product-images").upload(resultPath, resultBytes, { contentType: "image/png", upsert: true });
      const { data: resultUrlData } = supabase.storage.from("product-images").getPublicUrl(resultPath);

      // Update generation & credits
      await supabase.from("generations").update({ result_url: resultUrlData.publicUrl, status: "completed" }).eq("id", genId);
      await supabase.from("profiles").update({ credits_remaining: profile.credits_remaining - 1 }).eq("id", profile.id);

      await sendPhoto(botToken, chatId, resultUrlData.publicUrl,
        `✅ <b>Tayyor!</b>\n\n💰 Qolgan kreditlar: <b>${profile.credits_remaining - 1}</b>\n\n` +
        (profile.credits_remaining - 1 <= 0 ? `⚠️ Oxirgi kredit edi! /buy bilan yangi sotib oling.` : `📸 Yana rasm yuboring!`)
      );
      return new Response("OK");
    }

    // Unknown
    await sendMessage(botToken, chatId,
      "🤔 Tushunmadim.\n\n📸 Mahsulot rasmini yuboring yoki /help buyrug'ini yozing."
    );
    return new Response("OK");

  } catch (e) {
    console.error("Telegram bot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
