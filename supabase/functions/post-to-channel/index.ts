import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TELEGRAM_API = "https://api.telegram.org/bot";
const CHANNEL_ID = "-1003694153153";
const BOT_USERNAME = "infografixbot";
const WEB_APP_URL = "https://infografix.lovable.app";
const CHANNEL_URL = "https://t.me/infografix_ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!botToken || !lovableApiKey) {
      return new Response(JSON.stringify({ error: "Not configured" }), { status: 500 });
    }

    const { originalUrl, resultUrl, sceneType, language } = await req.json();

    if (!originalUrl || !resultUrl) {
      return new Response(JSON.stringify({ error: "Missing URLs" }), { status: 400 });
    }

    // Use AI to combine before/after into a single comparison image
    const combinePrompt = `Create a professional before/after product photo comparison image.

LAYOUT:
- Split the image horizontally into two equal halves side by side
- LEFT side: the ORIGINAL uploaded photo (as-is, unedited) with a small "OLDIN ❌" label at the top-left corner
- RIGHT side: the AI-ENHANCED professional photo with a small "KEYIN ✅" label at the top-right corner
- Add a thin vertical divider line between the two halves
- Add a subtle gradient banner at the bottom with text: "INFOGRAFIX AI — Mahsulot rasmlarini professional darajada tayyorlang"

STYLE:
- Clean, modern comparison layout
- The labels should be semi-transparent overlays, not covering the product
- Bottom banner should be elegant dark gradient with white text
- Final image should be 1080x1080 pixels (square, perfect for Telegram channel)
- Make it look like a premium before/after showcase`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: combinePrompt },
            { type: "image_url", image_url: { url: originalUrl } },
            { type: "image_url", image_url: { url: resultUrl } },
          ],
        }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI combine error:", aiResponse.status, await aiResponse.text());
      // Fallback: send result image only
      await sendResultOnly(botToken, resultUrl);
      return new Response(JSON.stringify({ success: true, fallback: true }));
    }

    const aiData = await aiResponse.json();
    const combinedBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!combinedBase64) {
      console.error("No combined image from AI");
      await sendResultOnly(botToken, resultUrl);
      return new Response(JSON.stringify({ success: true, fallback: true }));
    }

    // Send combined image to channel
    const base64Data = combinedBase64.replace(/^data:image\/\w+;base64,/, "");
    const rawBinary = atob(base64Data);
    const imageBytes = new Uint8Array(rawBinary.length);
    for (let i = 0; i < rawBinary.length; i++) {
      imageBytes[i] = rawBinary.charCodeAt(i);
    }

    const caption = `🎨 <b>INFOGRAFIX AI natijasi</b>\n\n` +
      `📸 Oddiy rasmni professional e-commerce fotoga aylantirdik!\n\n` +
      `✨ <b>Imkoniyatlar:</b>\n` +
      `• 🏪 Marketplace infografika\n` +
      `• 📷 Professional studiya\n` +
      `• 🌿 Tabiat va lifestyle sahnalar\n` +
      `• 🧑‍🎨 Model bilan kompozitsiya\n\n` +
      `💡 <i>1 ta bepul rasm — hoziroq sinab ko'ring!</i>`;

    // Upload as multipart form data
    const formData = new FormData();
    formData.append("chat_id", CHANNEL_ID);
    formData.append("photo", new Blob([imageBytes], { type: "image/png" }), "comparison.png");
    formData.append("caption", caption);
    formData.append("parse_mode", "HTML");
    formData.append("reply_markup", JSON.stringify({
      inline_keyboard: [
        [
          { text: "🆓 Bepul sinab ko'rish", url: `https://t.me/${BOT_USERNAME}?start=channel` }
        ],
        [
          { text: "👥 Do'stlarga ulashish", url: `https://t.me/share/url?url=${encodeURIComponent(CHANNEL_URL)}&text=${encodeURIComponent("🎨 Mahsulot rasmlarini AI bilan professional qiling! Bepul sinab ko'ring 👇")}` }
        ],
        [
          { text: "📱 Web App ochish", web_app: { url: WEB_APP_URL } }
        ]
      ]
    }));

    const sendRes = await fetch(`${TELEGRAM_API}${botToken}/sendPhoto`, {
      method: "POST",
      body: formData,
    });

    const sendResult = await sendRes.json();
    if (!sendResult.ok) {
      console.error("Channel send failed:", JSON.stringify(sendResult));
      // Try fallback with URL
      await sendResultOnly(botToken, resultUrl);
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

async function sendResultOnly(botToken: string, resultUrl: string) {
  const caption = `🎨 <b>INFOGRAFIX AI natijasi</b>\n\n` +
    `📸 Professional e-commerce foto — AI yordamida!\n\n` +
    `💡 <i>1 ta bepul rasm — hoziroq sinab ko'ring!</i>`;

  try {
    await fetch(`${TELEGRAM_API}${botToken}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        photo: resultUrl,
        caption,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🆓 Bepul sinab ko'rish", url: `https://t.me/${BOT_USERNAME}?start=channel` }],
            [{ text: "👥 Do'stlarga ulashish", url: `https://t.me/share/url?url=${encodeURIComponent(CHANNEL_URL)}&text=${encodeURIComponent("🎨 Mahsulot rasmlarini AI bilan professional qiling!")}` }],
          ]
        }
      }),
    });
  } catch (e) {
    console.error("Fallback send failed:", e);
  }
}
