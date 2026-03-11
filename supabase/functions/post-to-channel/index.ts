import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TELEGRAM_API = "https://api.telegram.org/bot";
const CHANNEL_ID = "-1003694153153";
const BOT_USERNAME = "infografixbot";
const CHANNEL_URL = "https://t.me/infografix_ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(JSON.stringify({ error: "Bot token not configured" }), { status: 500 });
    }

    const { originalUrl, resultUrl, sceneType, language } = await req.json();

    if (!originalUrl || !resultUrl) {
      return new Response(JSON.stringify({ error: "Missing URLs" }), { status: 400 });
    }

    // Step 1: Send before/after as media group (2 photos)
    const mediaGroup = [
      {
        type: "photo",
        media: originalUrl,
        caption: `❌ <b>OLDIN</b> — oddiy telefon surati`,
        parse_mode: "HTML",
      },
      {
        type: "photo",
        media: resultUrl,
        caption: `✅ <b>KEYIN</b> — INFOGRAFIX AI natijasi\n\n` +
          `📸 Oddiy rasmni professional e-commerce fotoga aylantirdik!\n\n` +
          `✨ <b>Imkoniyatlar:</b>\n` +
          `• 🏪 Marketplace infografika\n` +
          `• 📷 Professional studiya surati\n` +
          `• 🌿 Tabiat va lifestyle sahnalar\n` +
          `• 🧑‍🎨 Model bilan kompozitsiya\n\n` +
          `🎯 <b>Natija:</b> Sotuvlar 3-5 baravar oshadi!\n\n` +
          `💡 <i>1 ta bepul rasm — hoziroq sinab ko'ring!</i>`,
        parse_mode: "HTML",
      },
    ];

    const mediaRes = await fetch(`${TELEGRAM_API}${botToken}/sendMediaGroup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        media: mediaGroup,
      }),
    });

    const mediaResult = await mediaRes.json();

    if (!mediaResult.ok) {
      console.error("Media group send failed:", JSON.stringify(mediaResult));
      return new Response(JSON.stringify({ error: "Failed to send media group", details: mediaResult }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Send inline buttons as a separate message (reply to the media group)
    const lastMessageId = mediaResult.result?.[mediaResult.result.length - 1]?.message_id;

    const buttonText =
      `👆 <b>Yuqoridagi natijani ko'rdingizmi?</b>\n\n` +
      `🤖 INFOGRAFIX AI — mahsulot rasmlaringizni professional darajaga olib chiqadi.\n\n` +
      `⬇️ Boshlash uchun quyidagi tugmani bosing:`;

    const buttonRes = await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        text: buttonText,
        parse_mode: "HTML",
        reply_to_message_id: lastMessageId,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🆓 Bepul sinab ko'rish", url: `https://t.me/${BOT_USERNAME}?start=channel` },
            ],
            [
              {
                text: "👥 Do'stlarga ulashish",
                url: `https://t.me/share/url?url=${encodeURIComponent(CHANNEL_URL)}&text=${encodeURIComponent("🎨 Mahsulot rasmlarini AI bilan professional qiling! Bepul sinab ko'ring 👇")}`,
              },
            ],
          ],
        },
      }),
    });

    const buttonResult = await buttonRes.json();
    if (!buttonResult.ok) {
      console.error("Button message failed:", JSON.stringify(buttonResult));
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("post-to-channel error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
