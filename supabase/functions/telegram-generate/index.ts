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
      .select("id, credits_remaining, user_id, plan")
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

    let hasPaidHistory = profile.plan === "paid";
    if (!hasPaidHistory) {
      const paymentFilters = [`profile_id.eq.${profile.id}`, `telegram_id.eq.${telegram_id}`];
      if (profile.user_id) paymentFilters.push(`user_id.eq.${profile.user_id}`);

      const { count: approvedPaymentsCount, error: paymentsError } = await supabase
        .from("payment_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .or(paymentFilters.join(","));

      if (paymentsError) {
        console.error("Payment history check error:", paymentsError);
      } else {
        hasPaidHistory = (approvedPaymentsCount ?? 0) > 0;
      }
    }

    const shouldApplyWatermark = !hasPaidHistory && profile.credits_remaining === 1;

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
    const isFreeCreate = modelType === "free-create";

    const langCode = language || "uz";
    const langLabel = langCode === "ru" ? "rus tilida" : "o'zbek tilida";
    const langFull = langCode === "ru" ? "russkiy" : "o'zbek";

    const sceneMap: Record<string, string> = {
      nature: `Tashqi tabiat sahnasi. Golden hour tabiiy yoritishi. Mahsulot yashil o'simliklar, gullar yoki tabiiy toshlar orasida. Orqa fon yumshoq bokeh. Issiq ranglar.`,
      lifestyle: `Zamonaviy interer sahnasi. Marmar yoki yog'och sirt. Tabiiy deraza yoritishi. Mahsulot kundalik hayotda ishlatilayotgandek. 1-2 ta kontekstual aksessuar.`,
      studio: `Professional studiya. Silliq gradient fon (oqdan kulrangga). 3 nuqtali yoritish: 45° asosiy, yumshoq to'ldiruvchi, orqa kontur. Pastda aks ettiruvchi sirt.`,
      minimalist: `Minimalist sahna. Bir xil rangli toza fon. Mahsulot markazda, keng bo'sh joy. Yumshoq diffuz yorug'lik.`,
      infographic: `E-commerce infografika kartasi. FAQAT toza oq (#FFFFFF) fon. Mahsulot markazda. 3-4 ta xususiyat — har biri oddiy ikonka + 2-3 so'zli izoh. O'lcham chiziqlari. Barcha matnlar FAQAT ${langFull} tilida.`,
    };

    let prompt: string;

    if (isFreeCreate) {
      prompt = `Sen professional e-commerce fotograf va dizaynersan. Yuklangan mahsulot rasmini tahlil qilib, shu mahsulot KATEGORIYASIGA eng mos keladigan professional marketplace rasmini yarat.

VAZIFA: Mahsulotni sinchiklab o'rgan — turi, kategoriyasi, materiali, rangi, shakli, o'lchami. Keyin SHU KATEGORIYA uchun eng yaxshi sotilish natijasi beradigan sahna va kompozitsiyani O'ZING tanla.

RASM O'LCHAMI: ANIQ 1080x1440 piksel (3:4 vertikal).

MAHSULOT O'LCHAMI QOIDALARI (JUDA MUHIM — BUZMA):
- Mahsulotning HAQIQIY fizik o'lchamini aniqlash: telefon ~15cm, soat ~4cm, uzuk ~2cm, sumka ~30cm, krossovka ~30cm, krem ~10cm
- Kichik buyum (uzuk, labga bo'yoq, quloq halqa): YAQIN makro kadr, kadrning 50-70%
- O'rta buyum (telefon, soat, parfyum, hamyon): kadrning 35-50%
- Katta buyum (sumka, kiyim, oyoq kiyim): kadrning 40-60%
- Juda katta (mebel, jihoz): kadrning 60-80%
- HECH QACHON kichik buyumni sun'iy ravishda kattalab ko'rsatma
- HECH QACHON katta buyumni kichiklab ko'rsatma

KATEGORIYA ASOSIDA SAHNA TANLASH:
- Kiyim/poyafzal → lifestyle yoki studiya, model bilan yoki emoqda
- Elektronika → minimalist gradient fon, texnologik his
- Kosmetika/parfyum → elegant studiya, marmar yoki gul dekor
- Oziq-ovqat → tabiiy yoritish, yog'och sirt
- Aksessuar (soat, uzuk) → makro, yuqori detallangan studiya
- Uy-ro'zg'or → interer kontekstida

SIFAT TALABLARI:
- Fotorealistik — haqiqiy kamera bilan olingan professional fotosuratdek
- BARCHA detallar (logo, yozuv, textura, tikuv, tugma) aniq va o'qilishi mumkin
- Professional 3 nuqtali yoritish
- Asliy ranglar 100% saqlansin
- Sun'iy, plastik yoki 3D renderga o'xshamasin

${langCode !== "en" ? `MATN: Agar infografika elementlari qo'shsang, FAQAT ${langFull} tilida yoz. Inglizcha MUTLAQO ishlatma. Imloviy xato yo'q.` : ""}${shouldApplyWatermark ? `

WATERMARK: Rasmning markaziga yarim shaffof (40% opacity) "INFOGRAFIX AI" diagonal matn qo'y.` : ""}`;
    } else {
      const modelInstruction = modelType === "with-model"
        ? `Fotorealistik inson modelini qo'sh. Model mahsulotni tabiiy ishlatayotgan holatda. Anatomik proporsiyalar to'g'ri. Mahsulot fokusda qoladi.`
        : `Faqat mahsulot, inson yo'q. Eng yaxshi burchakdan ko'rsat. Soyalar orqali hajm. 1-2 kichik prop.`;

      prompt = `Sen professional e-commerce mahsulot fotografi. Bitta mukammal marketplace rasmi yarat.

RASM O'LCHAMI: ANIQ 1080x1440 piksel (3:4 vertikal).

MAHSULOT TAHLILI:
- Rasmni sinchiklab o'rgan: turi, kategoriyasi, materiali, rangi, teksturasi, shakli, brend logosi
- HAQIQIY FIZIK O'LCHAMINI aniqlash: telefon ~15cm, soat ~4cm, sumka ~30cm, uzuk ~2cm
- BARCHA detallar (tugma, chok, logo, yozuv, textura) ANIQ va O'QILISHI MUMKIN ko'rinsin

MAHSULOT O'LCHAMI QOIDALARI (JUDA MUHIM — BUZMA):
- Kichik buyum (uzuk, labga bo'yoq, quloq halqa): YAQIN makro kadr, kadrning 50-70%
- O'rta buyum (telefon, soat, parfyum, hamyon): kadrning 35-50%
- Katta buyum (sumka, kiyim, oyoq kiyim): kadrning 40-60%
- Juda katta (mebel, jihoz): kadrning 60-80%
- Mahsulotni REAL proporsiyada ko'rsat

SAHNA: ${sceneMap[sceneType] || sceneMap.studio}
MODEL: ${modelInstruction}

YORITISH: 3 nuqtali professional yoritish. ASLIY ranglar 100% saqlansin. Yumshoq soyalar.

MATN (FAQAT INFOGRAFIKA UCHUN): FAQAT ${langFull} tilida. Inglizcha MUTLAQO yo'q. Imloviy xato yo'q. Zamonaviy shrift.

SIFAT: Fotorealistik, professional studiya darajasi. Sun'iy ko'rinmasin. Detalar o'tkir.${shouldApplyWatermark ? `

WATERMARK: Rasmning markaziga yarim shaffof (40% opacity) "INFOGRAFIX AI" diagonal matn qo'y.` : ""}`;
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
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

    // Fire-and-forget: post before/after to Telegram channel
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey2 = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      if (origSignedData?.signedUrl && resultSignedData?.signedUrl) {
        fetch(`${supabaseUrl}/functions/v1/post-to-channel`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey2}` },
          body: JSON.stringify({
            originalUrl: origSignedData.signedUrl,
            resultUrl: resultSignedData.signedUrl,
            sceneType,
            language: langCode,
          }),
        }).catch(e => console.error("Channel post fire-and-forget error:", e));
      }
    } catch (e) {
      console.error("Channel post setup error:", e);
    }

    return new Response(JSON.stringify({
      resultUrl: resultSignedData?.signedUrl || "",
      originalUrl: origSignedData?.signedUrl || "",
      creditsRemaining: profile.credits_remaining - 1,
      generationId: genId,
      watermarked: shouldApplyWatermark,
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
