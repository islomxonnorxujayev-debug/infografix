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
      nature: `Tashqi tabiat: oltin soat yoritishi, bog'/o'rmon/qirg'oq. Issiq ranglar, bokeh orqa fon, hajmli yorug'lik.`,
      lifestyle: `Turmush tarzi: zamonaviy kvartira/kafe/oshxona. Issiq yoritish, boy teksturalar (marmar, yog'och, zig'ir).`,
      studio: `Studiya: tekis gradient fon, 3 nuqtali yoritish (45° asosiy, yumshoq to'ldirish, kontur yoritish), pastda aks ettiruvchi sirt.`,
      minimalist: `Minimalist: bir rangli/gradient fon, keng bo'sh joy, 1-2 ta mos prop. Yumshoq tarqalgan yorug'lik.`,
      infographic: `Marketplace infografika kartasi. Oq/yorug' fon. Mahsulot markazda. 3-4 ta xususiyat belgilari ikonkalar bilan. Sifat belgilari. Barcha yozuvlar faqat ${langLabel}.`,
    };

    const modelInstruction = withModel
      ? `Fotorealistik modelni mahsulotdan foydalanayotgan holda tabiiy qo'shing. Model hikoyani boyitadi, mahsulot asosiy fokusda qoladi.`
      : `Faqat mahsulot. Dinamik burchaklar, badiiy soyalar, kontekst uchun mos proplar.`;

    const prompt = `Sen professional e-commerce mahsulot fotografi. Bitta ajoyib mahsulot rasmi yarat.

MUHIM O'LCHAM: Rasm aniq 1080x1440 piksel (3:4 nisbat) bo'lishi SHART.

MAHSULOT TAHLILI: Yuklangan rasmni chuqur o'rganing — kategoriyasi, haqiqiy o'lchamlari, asosiy xususiyatlari, ranglari, materiali, teksturasi, brend elementlari. Har bir detalga e'tibor ber.

SAHNA: ${sceneMap[sceneType] || sceneMap.studio}

MODEL: ${modelInstruction}

MASSHTAB (MUHIM): Mahsulot HAQIQIY o'lchamda. Kadrning 25-40% ini egallaydi. Kichik buyumlar (uzuk, pomada) — yaqinroq kadr. Katta buyumlar (divan, palto) — tabiiy to'ldirish. Proplar masshtab uchun yo'naltiruvchi.

YORITISH: 3 nuqtali professional yoritish. Kinematografik rang sozlash. Mahsulotning asl ranglari saqlanadi. Engil vinyet.

DIZAYN: 1-2 nafis matnli qoplama faqat ${langLabel} — mahsulot kategoriyasi yoki qisqa shior. Zamonaviy toza tipografiya. HECH QANDAY inglizcha so'z ishlatma.

IMLO: Infografikadagi barcha matnlar imlo va grammatika jihatdan 100% to'g'ri bo'lsin. Hech qanday xato harf yoki noto'g'ri yozuv bo'lmasin.

FORMAT (QAT'IY): Yakuniy rasm faqat 1080x1440 piksel bo'lsin. Boshqa o'lcham yaratma.

SIFAT: $5000 lik professional fotosessiya darajasi. Sun'iy ko'rinmasin. Har safar noyob kompozitsiya.${shouldApplyWatermark ? `

WATERMARK (MUHIM): Rasmning markaziga katta yarim shaffof (40% opacity) "INFOGRAFIX AI" matnini diagonal (45°) qilib yozib qo'y. Matn oq rangda, katta shriftda, butun rasm bo'ylab ko'rinsin. Bu MAJBURIY.` : ""}`;

    console.log("Gen:", generationId, modelType, sceneType, language);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
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

    return new Response(
      JSON.stringify({
        resultUrl: resultSignedUrl,
        creditsRemaining: profile.credits_remaining - 1,
        watermarked: profile.plan === "free" && profile.credits_remaining <= 1,
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
