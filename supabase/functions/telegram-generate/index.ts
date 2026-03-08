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
    const { init_data, telegram_id: raw_telegram_id, image_base64, scene_type, model_type, language } = await req.json();

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

    if (!image_base64 || typeof image_base64 !== "string") {
      return new Response(JSON.stringify({ error: "image_base64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (image_base64.length > 14_000_000) {
      return new Response(JSON.stringify({ error: "Rasm juda katta (max 10MB)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI tizimi sozlanmagan" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, credits_remaining, user_id")
      .eq("telegram_id", telegram_id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profil topilmadi" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.credits_remaining <= 0) {
      return new Response(JSON.stringify({ error: "Kredit tugadi. /buy buyrug'i bilan sotib oling." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload original image to storage
    const base64Clean = image_base64.replace(/^data:image\/\w+;base64,/, "");
    const rawBinary = atob(base64Clean);
    const imageBytes = new Uint8Array(rawBinary.length);
    for (let i = 0; i < rawBinary.length; i++) {
      imageBytes[i] = rawBinary.charCodeAt(i);
    }
    const genId = crypto.randomUUID();
    const originalPath = `${profile.id}/originals/${genId}.png`;

    const { error: uploadErr } = await supabase.storage
      .from("product-images")
      .upload(originalPath, imageBytes, { contentType: "image/png", upsert: true });

    if (uploadErr) {
      return new Response(JSON.stringify({ error: "Rasmni saqlashda xatolik" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use signed URL for AI access (private bucket)
    const { data: originalSignedData } = await supabase.storage.from("product-images")
      .createSignedUrl(originalPath, 60 * 30); // 30 min for AI processing

    if (!originalSignedData?.signedUrl) {
      return new Response(JSON.stringify({ error: "Rasm URL yaratishda xatolik" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sceneType = scene_type || "studio";
    const modelType = model_type || "without-model";

    await supabase.from("generations").insert({
      id: genId,
      user_id: profile.user_id || null,
      telegram_id,
      original_url: originalPath,
      marketplace: "Web App / Studio",
      style_preset: sceneType,
      enhancements: { model: modelType, scene: sceneType, language: language || "uz", source: "webapp" },
      status: "processing",
    });

    const langCode = language || "uz";
    const langLabel = langCode === "ru" ? "rus tilida" : "o'zbek tilida";

    const sceneMap: Record<string, string> = {
      nature: `Tashqi tabiat: oltin soat yoritishi, bog'/o'rmon. Issiq ranglar, bokeh orqa fon.`,
      lifestyle: `Turmush tarzi: zamonaviy kvartira/kafe. Issiq yoritish, boy teksturalar.`,
      studio: `Studiya: tekis gradient fon, 3 nuqtali yoritish, aks ettiruvchi sirt.`,
      minimalist: `Minimalist: bir rangli fon, keng bo'sh joy, yumshoq yorug'lik.`,
      infographic: `Marketplace infografika kartasi. Oq fon. Mahsulot markazda. Xususiyat belgilari ikonkalar bilan. Barcha yozuvlar faqat ${langLabel}.`,
    };

    const modelInstruction = modelType === "with-model"
      ? "Fotorealistik modelni mahsulotdan foydalanayotgan holda tabiiy qo'shing."
      : "Faqat mahsulot. Dinamik burchaklar, badiiy soyalar, mos proplar.";

    const prompt = `Sen professional e-commerce mahsulot fotografi. Bitta ajoyib mahsulot rasmi yarat.
MUHIM O'LCHAM: Rasm aniq 1080x1440 piksel (3:4 nisbat) bo'lishi SHART.
MAHSULOT TAHLILI: Yuklangan rasmni chuqur o'rganing — kategoriyasi, haqiqiy o'lchamlari, xususiyatlari, ranglari, materiali, teksturasi. Har bir detalga e'tibor ber.
SAHNA: ${sceneMap[sceneType] || sceneMap.studio}
MODEL: ${modelInstruction}
MASSHTAB: Mahsulot HAQIQIY o'lchamda. Kadrning 25-40% ini egallaydi.
YORITISH: 3 nuqtali professional. Kinematografik rang sozlash. Asl ranglar saqlanadi.
DIZAYN: 1-2 nafis matn faqat ${langLabel}. HECH QANDAY inglizcha so'z ishlatma.
SIFAT: $5000 lik professional fotosessiya darajasi. Sun'iy ko'rinmasin. Noyob kompozitsiya.`;

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
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: originalSignedData.signedUrl } },
          ],
        }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      await supabase.from("generations").update({ status: "failed" }).eq("id", genId);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI band. 1-2 daqiqadan keyin qayta urinib ko'ring." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI xatolik. Qayta urinib ko'ring." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const resultBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!resultBase64) {
      await supabase.from("generations").update({ status: "failed" }).eq("id", genId);
      return new Response(JSON.stringify({ error: "AI rasm qaytarmadi. Qayta urinib ko'ring." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resultClean = resultBase64.replace(/^data:image\/\w+;base64,/, "");
    const rawResult = atob(resultClean);
    const resultBytes = new Uint8Array(rawResult.length);
    for (let i = 0; i < rawResult.length; i++) {
      resultBytes[i] = rawResult.charCodeAt(i);
    }
    const resultPath = `${profile.id}/results/${genId}.png`;

    await supabase.storage.from("product-images").upload(resultPath, resultBytes, {
      contentType: "image/png", upsert: true,
    });

    // Generate signed URLs for response
    const { data: resultSignedData } = await supabase.storage.from("product-images")
      .createSignedUrl(resultPath, 60 * 60 * 24 * 7); // 7 days
    const { data: origSignedData } = await supabase.storage.from("product-images")
      .createSignedUrl(originalPath, 60 * 60 * 24 * 7);

    await supabase.from("generations").update({
      result_url: resultPath, status: "completed"
    }).eq("id", genId);
    await supabase.from("profiles").update({
      credits_remaining: profile.credits_remaining - 1
    }).eq("id", profile.id);

    return new Response(JSON.stringify({
      resultUrl: resultSignedData?.signedUrl || "",
      originalUrl: origSignedData?.signedUrl || "",
      creditsRemaining: profile.credits_remaining - 1,
      generationId: genId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("telegram-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Xatolik" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
