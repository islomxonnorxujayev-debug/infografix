import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function validateTelegramInitData(initData: string, botToken: string): { valid: boolean; userId?: number } {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return { valid: false };

    params.delete("hash");
    const dataCheckArr = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${key}=${val}`);
    const dataCheckString = dataCheckArr.join("\n");

    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const checkHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (checkHash !== hash) return { valid: false };

    const userStr = params.get("user");
    if (!userStr) return { valid: false };
    const user = JSON.parse(userStr);

    const authDate = parseInt(params.get("auth_date") || "0");
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) return { valid: false };

    return { valid: true, userId: user.id };
  } catch {
    return { valid: false };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { init_data, telegram_id: raw_telegram_id, package_name, credits, amount, screenshot_base64 } = await req.json();

    if (!package_name || !credits || !amount || !screenshot_base64) {
      return new Response(JSON.stringify({ error: "Ma'lumotlar to'liq emas" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

    // REQUIRE init_data - no fallback to raw telegram_id
    if (!init_data || !botToken) {
      return new Response(JSON.stringify({ error: "Telegram authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validation = validateTelegramInitData(init_data, botToken);
    if (!validation.valid || !validation.userId) {
      return new Response(JSON.stringify({ error: "Invalid Telegram authentication" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const telegram_id = validation.userId;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, user_id")
      .eq("telegram_id", telegram_id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profil topilmadi" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload screenshot
    const base64Clean = screenshot_base64.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Clean), (c) => c.charCodeAt(0));
    const fileId = crypto.randomUUID();
    const filePath = `${profile.id}/payments/${fileId}.jpg`;

    const { error: uploadErr } = await supabase.storage
      .from("payment-screenshots")
      .upload(filePath, imageBytes, { contentType: "image/jpeg", upsert: true });

    if (uploadErr) {
      console.error("Screenshot upload error:", uploadErr);
      return new Response(JSON.stringify({ error: "Skrinshot yuklashda xatolik" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const screenshotRef = `payment-screenshots/${filePath}`;

    // Insert payment request
    const { data: paymentReq, error: insertErr } = await supabase.from("payment_requests").insert({
      user_id: profile.user_id || null,
      telegram_id,
      profile_id: profile.id,
      package_name,
      credits,
      amount: String(amount),
      screenshot_url: screenshotRef,
      status: "pending",
    }).select("id").single();

    if (insertErr) {
      console.error("Payment insert error:", insertErr);
      return new Response(JSON.stringify({ error: "To'lov so'rovini saqlashda xatolik" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send Telegram notification to admin with screenshot and approve/reject buttons
    const adminChatId = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
    if (adminChatId && botToken && paymentReq?.id) {
      const profileData = (await supabase.from("profiles").select("first_name, telegram_username").eq("telegram_id", telegram_id).single()).data;
      const userName = profileData?.first_name || profileData?.telegram_username || `TG:${telegram_id}`;

      // Get signed URL for the screenshot
      const { data: signedData } = await supabase.storage
        .from("payment-screenshots")
        .createSignedUrl(filePath, 60 * 60 * 24);

      const caption = `🔔 <b>Yangi to'lov so'rovi!</b>\n\n👤 ${userName}\n📦 ${package_name}\n💰 ${Number(amount).toLocaleString()} so'm\n🎯 ${credits} kredit\n\n⏳ Tasdiqlash kutilmoqda`;

      const inlineKeyboard = {
        inline_keyboard: [[
          { text: "✅ Tasdiqlash", callback_data: `approve:${paymentReq.id}` },
          { text: "❌ Rad etish", callback_data: `reject:${paymentReq.id}` },
        ]]
      };

      try {
        if (signedData?.signedUrl) {
          // Send photo with caption and buttons
          await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: adminChatId,
              photo: signedData.signedUrl,
              caption,
              parse_mode: "HTML",
              reply_markup: inlineKeyboard,
            }),
          });
        } else {
          // Fallback: send text with buttons if screenshot URL fails
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: adminChatId,
              text: caption,
              parse_mode: "HTML",
              reply_markup: inlineKeyboard,
            }),
          });
        }
      } catch (notifErr) {
        console.error("Admin notification error:", notifErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("submit-payment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Xatolik" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});