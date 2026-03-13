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
    const langLabel = language === "ru" ? "rus tilida" : "o'zbek tilida";

    const sceneMap: Record<string, string> = {
      nature: `Tashqi tabiat sahnasi. Oltin soat (golden hour) tabiiy yoritishi. Mahsulot yashil o'simliklar, gullar yoki tabiiy toshlar orasida joylashgan. Orqa fon yumshoq bokeh effektida. Issiq ranglar palitrasi.`,
      lifestyle: `Turmush tarzi sahnasi. Zamonaviy interer — marmar stol, yog'och sirt yoki zig'ir matoli fon. Tabiiy deraza yoritishi. Mahsulot kundalik hayotda ishlatilayotgandek ko'rinishi kerak. 1-2 ta mos aksessuar (kofe stakan, kitob, gul).`,
      studio: `Professional studiya. Silliq gradient fon (oqdan kulrang yoki pastel rangga). 3 nuqtali yoritish sxemasi: 45° burchakdagi asosiy yorug'lik, yumshoq to'ldiruvchi yorug'lik, orqa kontur yorug'lik. Pastda aks ettiruvchi sirt.`,
      minimalist: `Minimalist sahna. Bir xil rangli toza fon (oq, och kulrang yoki pastel). Mahsulot markazda, atrofda keng bo'sh joy. 1 ta kichik dekorativ element. Yumshoq diffuz yorug'lik, soyalar deyarli yo'q.`,
      infographic: `Marketplace infografika kartasi. FAQAT oq fon. Mahsulot markazda aniq ko'rinadi. Mahsulot atrofida 3-4 ta xususiyat belgilari — har biri ikonka + qisqa matn (faqat ${langLabel}). O'lcham ko'rsatkichlari. Sifat belgilari. Barcha yozuvlar FAQAT ${langLabel}, HECH QANDAY inglizcha so'z bo'lmasin.`,
    };

    const modelInstruction = withModel
      ? `Fotorealistik inson modelini qo'shing. Model mahsulotni tabiiy ravishda ishlatayotgan yoki ushlab turgan holatda. Model tana proporsiyalari anatomik jihatdan to'g'ri bo'lsin. Yuz ifodasi tabiiy. Mahsulot asosiy fokusda qoladi, model fon hikoyasini boyitadi.`
      : `Faqat mahsulot, inson yo'q. Mahsulotni eng foydali burchakdan ko'rsating. Perspektiva va soyalar orqali hajm his etilsin. Kontekst uchun 1-2 kichik prop qo'shing.`;

    const prompt = `Sen dunyodagi eng yaxshi e-commerce mahsulot fotografi. Bitta mukammal mahsulot rasmi yarat.

RASM O'LCHAMI (MAJBURIY): Yakuniy rasm ANIQ 1080x1440 piksel (3:4 vertikal nisbat) bo'lishi SHART. Boshqa hech qanday o'lcham qabul qilinmaydi.

MAHSULOT TAHLILI (MUHIM):
- Yuklangan rasmni SINCHIKLAB o'rgana: mahsulot turi, kategoriyasi, materiali, rangi, teksturasi, shakli, brend logosi
- Mahsulotning HAQIQIY FIZIK O'LCHAMI ni aniqlash: telefon (~15cm), soat (~4cm), sumka (~30cm), kiyim, oyoq kiyim, kosmetika va h.k.
- Mahsulotni REAL proporsiyada tasvirla — kichik buyumni katta qilma, katta buyumni kichiklashtirma
- Mahsulotning barcha detallarini (tugma, chok, logo, yozuv) ANIQ va O'QILISHI MUMKIN qilib ko'rsat

SAHNA SOZLAMASI: ${sceneMap[sceneType] || sceneMap.studio}

MODEL KO'RSATMASI: ${modelInstruction}

MASSHTAB QOIDALARI (JUDA MUHIM):
- Kichik buyumlar (uzuk, quloq halqa, labga bo'yoq, flash-karta): YAQIN KADR, mahsulot kadrning 50-70% ini egallaydi
- O'rta buyumlar (telefon, soat, hamyon, parfyum): mahsulot kadrning 35-50% ini egallaydi
- Katta buyumlar (sumka, oyoq kiyim, kiyim): mahsulot kadrning 40-60% ini egallaydi
- Juda katta buyumlar (mebel, jihoz): mahsulot kadrning 60-80% ini egallaydi
- Masshtab uchun tanish proplar (qalam, tanga, qo'l) foydalanish mumkin

YORITISH VA RANG:
- 3 nuqtali professional yoritish sxemasi
- Mahsulotning ASLIY ranglari 100% saqlansin — rangni o'zgartirma
- Kinematografik rang sozlash (color grading)
- Yumshoq soyalar orqali hajm va chuqurlik
- Engil vinyet effekti

MATN VA TIPOGRAFIYA (FAQAT INFOGRAFIKA UCHUN):
- Barcha matnlar FAQAT ${langLabel} bo'lsin
- HECH QANDAY inglizcha so'z, harf yoki belgi ishlatma
- Matn imloviy va grammatik jihatdan 100% TO'G'RI bo'lsin
- Zamonaviy, toza shrift. O'qilishi oson
- Matn mahsulotni yopmaydi

SIFAT TALABLARI:
- Professional fotostudiya darajasidagi natija
- Fotorealistik — sun'iy yoki kompyuterda yaratilgandek ko'rinmasin
- Piksellar aniq, detalar o'tkir
- Rang va kontrast balansi mukammal${shouldApplyWatermark ? `

WATERMARK (MAJBURIY): Rasmning MARKAZIGA katta yarim shaffof (40% opacity) "INFOGRAFIX AI" matnini diagonal (45°) qilib yozib qo'y. Matn oq rangda, katta shriftda, butun rasm bo'ylab aniq ko'rinsin.` : ""}`;

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
