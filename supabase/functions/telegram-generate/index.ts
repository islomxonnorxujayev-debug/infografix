import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { telegram_id, image_base64, scene_type, model_type } = await req.json();

    // Validate telegram_id
    if (!telegram_id || typeof telegram_id !== "number" || telegram_id <= 0) {
      return new Response(JSON.stringify({ error: "Invalid telegram_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!image_base64 || typeof image_base64 !== "string") {
      return new Response(JSON.stringify({ error: "image_base64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit image size (~10MB base64)
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

    // Get profile and check credits
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
    const imageBytes = Uint8Array.from(atob(base64Clean), (c) => c.charCodeAt(0));
    const genId = crypto.randomUUID();
    const originalPath = `${profile.id}/originals/${genId}.jpg`;

    const { error: uploadErr } = await supabase.storage
      .from("product-images")
      .upload(originalPath, imageBytes, { contentType: "image/jpeg", upsert: true });

    if (uploadErr) {
      return new Response(JSON.stringify({ error: "Rasmni saqlashda xatolik" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: originalUrlData } = supabase.storage.from("product-images").getPublicUrl(originalPath);

    // Create generation record
    const sceneType = scene_type || "studio";
    const modelType = model_type || "without-model";

    await supabase.from("generations").insert({
      id: genId,
      user_id: profile.user_id || null,
      telegram_id,
      original_url: originalUrlData.publicUrl,
      marketplace: "Web App / Studio",
      style_preset: sceneType,
      enhancements: { model: modelType, scene: sceneType, language: "uz", source: "webapp" },
      status: "processing",
    });

    // Build prompt
    const sceneMap: Record<string, string> = {
      nature: "Outdoor nature: golden-hour sunlit garden. Warm tones, bokeh background.",
      lifestyle: "Lifestyle: modern apartment/cafe. Warm ambient light, rich textures.",
      studio: "Studio: seamless gradient backdrop, 3-point lighting, reflective surface.",
      minimalist: "Minimalist: solid/gradient backdrop, ample negative space, soft diffused light.",
      infographic: "Marketplace infographic card. White background. Product centered. Feature callouts with Uzbek labels.",
    };

    const modelInstruction = modelType === "with-model"
      ? "Include photorealistic model naturally using the product."
      : "Product-only. Dynamic angles, artistic shadows, complementary props.";

    const prompt = `Elite e-commerce product photographer. Create ONE scroll-stopping product image.
OUTPUT: 1080×1440px (3:4), high-res, no artifacts.
PRODUCT ANALYSIS: Study uploaded image — category, dimensions, features, colors, materials.
SCENE: ${sceneMap[sceneType] || sceneMap.studio}
MODEL: ${modelInstruction}
SCALE: Product at CORRECT real-world size. 25-40% of frame.
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
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: originalUrlData.publicUrl } },
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

    // Upload result
    const resultClean = resultBase64.replace(/^data:image\/\w+;base64,/, "");
    const resultBytes = Uint8Array.from(atob(resultClean), (c) => c.charCodeAt(0));
    const resultPath = `${profile.id}/results/${genId}.png`;

    await supabase.storage.from("product-images").upload(resultPath, resultBytes, {
      contentType: "image/png", upsert: true,
    });
    const { data: resultUrlData } = supabase.storage.from("product-images").getPublicUrl(resultPath);

    // Update generation & credits
    await supabase.from("generations").update({
      result_url: resultUrlData.publicUrl, status: "completed"
    }).eq("id", genId);
    await supabase.from("profiles").update({
      credits_remaining: profile.credits_remaining - 1
    }).eq("id", profile.id);

    return new Response(JSON.stringify({
      resultUrl: resultUrlData.publicUrl,
      originalUrl: originalUrlData.publicUrl,
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
