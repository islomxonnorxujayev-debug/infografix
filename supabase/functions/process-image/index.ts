import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("credits_remaining, plan, telegram_id")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.credits_remaining <= 0) {
      return new Response(JSON.stringify({ error: "Kredit tugadi. Iltimos, tarifingizni yangilang." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let hasPaidHistory = profile.plan === "paid";
    if (!hasPaidHistory) {
      const paymentFilters = [`user_id.eq.${user.id}`];
      if (profile.telegram_id) paymentFilters.push(`telegram_id.eq.${profile.telegram_id}`);

      const { count: approvedPaymentsCount, error: paymentsError } = await supabaseAdmin
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

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageUrl, modelType, sceneType, generationId, language } = body;

    if (!imageUrl || !generationId) {
      return new Response(JSON.stringify({ error: "Missing imageUrl or generationId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const withModel = modelType === "with-model";
    const isFreeCreate = modelType === "free-create";
    const langCode = language || "uz";
    const langFull = langCode === "ru" ? "russkiy" : "o'zbek";

    const sceneMap: Record<string, string> = {
      nature: `Tashqi tabiat sahnasi. Golden hour tabiiy yoritishi. Mahsulot yashil o'simliklar, gullar orasida. Orqa fon yumshoq bokeh. Issiq ranglar.`,
      lifestyle: `Zamonaviy interer. Marmar yoki yog'och sirt. Tabiiy deraza yoritishi. Mahsulot kundalik hayotda ishlatilayotgandek. 1-2 ta kontekstual aksessuar.`,
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
- Kiyim/poyafzal: lifestyle yoki studiya, model bilan yoki emoqda
- Elektronika: minimalist gradient fon, texnologik his
- Kosmetika/parfyum: elegant studiya, marmar yoki gul dekor
- Oziq-ovqat: tabiiy yoritish, yog'och sirt
- Aksessuar (soat, uzuk): makro, yuqori detallangan studiya
- Uy-ro'zg'or: interer kontekstida

SIFAT TALABLARI:
- Fotorealistik — haqiqiy kamera bilan olingan professional fotosuratdek bo'lsin
- Mahsulotning BARCHA detallari (logo, yozuv, textura, tikuv, tugma) aniq va o'qilishi mumkin
- Professional 3 nuqtali yoritish
- Asliy ranglar 100% saqlansin — rangni o'zgartirma
- Sun'iy, plastik yoki 3D renderga o'xshamasin

${langCode !== "en" ? `MATN: Agar infografika elementlari qo'shsang, FAQAT ${langFull} tilida yoz. Inglizcha so'z MUTLAQO ishlatma. Imloviy xato yo'q.` : ""}${shouldApplyWatermark ? `

WATERMARK: Rasmning markaziga yarim shaffof (40% opacity) "INFOGRAFIX AI" diagonal matn qo'y.` : ""}`;
    } else {
      const modelInstruction = withModel
        ? `Fotorealistik inson modelini qo'sh. Model mahsulotni tabiiy ishlatayotgan yoki ushlab turgan holatda. Anatomik proporsiyalar to'g'ri. Yuz tabiiy. Mahsulot fokusda qoladi.`
        : `Faqat mahsulot, inson yo'q. Eng yaxshi burchakdan ko'rsat. Soyalar orqali hajm. 1-2 kichik kontekstual prop.`;

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
- Mahsulotni REAL proporsiyada ko'rsat — kattalashtirma, kichiklashtirma

SAHNA: ${sceneMap[sceneType] || sceneMap.studio}
MODEL: ${modelInstruction}

YORITISH: 3 nuqtali professional yoritish. ASLIY ranglar 100% saqlansin. Yumshoq soyalar.

MATN (FAQAT INFOGRAFIKA UCHUN): FAQAT ${langFull} tilida yoz. Inglizcha MUTLAQO yo'q. Imloviy xato yo'q. Zamonaviy shrift.

SIFAT: Fotorealistik, professional studiya darajasi. Sun'iy ko'rinmasin. Detalar o'tkir.${shouldApplyWatermark ? `

WATERMARK: Rasmning markaziga yarim shaffof (40% opacity) "INFOGRAFIX AI" diagonal matn qo'y.` : ""}`;
    }

    console.log("Gen:", generationId, modelType, sceneType, language);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI tizimi band. Bir ozdan keyin qayta urinib ko'ring." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI rasmni qayta ishlashda xatolik yuz berdi" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();

    const choiceError = aiData.choices?.[0]?.error;
    if (choiceError) {
      console.error("AI choice error:", JSON.stringify(choiceError));
      if (choiceError.metadata?.error_type === "rate_limit_exceeded" || choiceError.code === 429) {
        return new Response(JSON.stringify({ error: "AI tizimi band. 1-2 daqiqadan keyin qayta urinib ko'ring." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI xatolik qaytardi. Qayta urinib ko'ring." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resultImageBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!resultImageBase64) {
      console.error("No image in response:", JSON.stringify(aiData).slice(0, 500));
      return new Response(JSON.stringify({ error: "AI rasm qaytarmadi. Qayta urinib ko'ring." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const base64Data = resultImageBase64.replace(/^data:image\/\w+;base64,/, "");
    const rawBinary = atob(base64Data);
    const binaryData = new Uint8Array(rawBinary.length);
    for (let i = 0; i < rawBinary.length; i++) {
      binaryData[i] = rawBinary.charCodeAt(i);
    }
    const resultPath = `${user.id}/results/${generationId}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("product-images")
      .upload(resultPath, binaryData, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Natija rasmni saqlashda xatolik" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from("product-images")
      .createSignedUrl(resultPath, 60 * 60 * 24 * 7); // 7 days

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Signed URL error:", signedUrlError);
      return new Response(JSON.stringify({ error: "Failed to generate download URL" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resultSignedUrl = signedUrlData.signedUrl;

    await supabaseAdmin
      .from("generations")
      .update({ result_url: resultPath, status: "completed" })
      .eq("id", generationId);

    await supabaseAdmin
      .from("profiles")
      .update({ credits_remaining: profile.credits_remaining - 1 })
      .eq("user_id", user.id);

    // Fire-and-forget: post before/after to Telegram channel
    try {
      // Get original image signed URL
      const generation = await supabaseAdmin.from("generations").select("original_url").eq("id", generationId).single();
      if (generation.data?.original_url) {
        const { data: origSigned } = await supabaseAdmin.storage.from("product-images")
          .createSignedUrl(generation.data.original_url, 60 * 30);
        if (origSigned?.signedUrl) {
          fetch(`${supabaseUrl}/functions/v1/post-to-channel`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseServiceKey}` },
            body: JSON.stringify({
              originalUrl: origSigned.signedUrl,
              resultUrl: resultSignedUrl,
              sceneType: sceneType || "studio",
              language: language || "uz",
            }),
          }).catch(e => console.error("Channel post fire-and-forget error:", e));
        }
      }
    } catch (e) {
      console.error("Channel post setup error:", e);
    }

    return new Response(
      JSON.stringify({
        resultUrl: resultSignedUrl,
        creditsRemaining: profile.credits_remaining - 1,
        watermarked: shouldApplyWatermark,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Noma'lum xatolik" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
