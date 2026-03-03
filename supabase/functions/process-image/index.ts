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
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.credits_remaining <= 0) {
      return new Response(JSON.stringify({ error: "Kredit tugadi. Iltimos, tarifingizni yangilang." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageUrl, modelType, sceneType, generationId, language } = await req.json();

    if (!imageUrl || !generationId) {
      return new Response(JSON.stringify({ error: "Missing imageUrl or generationId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const withModel = modelType === "with-model";

    const sceneInstructions: Record<string, string> = {
      nature: `BACKGROUND: Lush outdoor nature scene. Options: garden with blooming flowers, forest clearing with sunlight rays, tropical beach, mountain meadow, autumn park with golden leaves. Use natural sunlight with warm golden tones. Add depth of field with bokeh on background greenery.`,
      lifestyle: `BACKGROUND: Realistic lifestyle environment where the product naturally belongs. Options: modern apartment, cozy kitchen, trendy cafe, office desk setup, bedroom vanity, outdoor patio. The scene should tell a story about the product's use in everyday life. Warm, inviting ambient lighting.`,
      studio: `BACKGROUND: High-end photography studio setup. Options: seamless gradient backdrop (vary colors: soft gray, warm beige, cool blue, blush pink), dramatic spotlight with rim lighting, professional product photography with reflections on glossy surface. Clean, premium, commercial feel.`,
      minimalist: `BACKGROUND: Ultra-clean minimalist design. Solid color or very subtle gradient. Options: pure white with soft shadow, pale pastel (mint, lavender, peach), geometric shapes as subtle accents, floating product on clean surface. Focus entirely on the product. Lots of negative space.`,
      infographic: `BACKGROUND: Information-rich design layout. Clean solid or gradient background with space for text overlays. Include: product feature callouts with arrows/lines pointing to key areas, benefit icons, specification badges, comparison charts or rating stars. The design should educate the viewer about the product while looking premium.`,
    };

    const modelInstructions = withModel
      ? `HUMAN MODEL: Include an attractive, diverse model naturally interacting with the product. The model should be wearing/holding/using/demonstrating the product in a believable way. Show genuine expression — confidence, joy, or satisfaction. Model should complement the product, not overshadow it. Professional fashion/commercial photography quality.`
      : `NO HUMAN MODEL: Do not include any person in the image. Focus entirely on the product itself. Use creative product photography techniques: floating product, dynamic angles, artistic shadows, reflections, or complementary props that enhance the product story.`;

    const prompt = `You are the world's top e-commerce product photographer and creative director. Create a PREMIUM promotional product image.

OUTPUT: Exactly 1080x1440 pixels (3:4 portrait ratio).

ANALYZE THE PRODUCT: Look at this product image carefully. Identify what it is (clothing, electronics, cosmetics, food, furniture, etc.) and design everything around making THIS specific product irresistible to buy.

${sceneInstructions[sceneType] || sceneInstructions.studio}

${modelInstructions}

PRODUCT PLACEMENT:
- Extract the product cleanly from its current background
- Place it prominently in the new scene — it should be the hero of the composition
- Apply professional studio lighting: key light, fill light, rim light for depth
- Ensure the product colors, textures, and details are accurate and enhanced
- Product should occupy 40-60% of the frame

COMMERCIAL QUALITY:
- Add subtle text overlays in the product's language context: product name or category as elegant typography
- Include 1-2 small benefit badges or quality indicators
- Professional color grading that matches the scene mood
- Sharp focus on product, appropriate depth of field on background
- The final image must look like it belongs in a premium online store listing

VARIETY: Make each generation unique. Vary the exact background colors, lighting angles, composition, and styling. The image should feel fresh and premium.`;

    console.log("Generating:", generationId, "model:", modelType, "scene:", sceneType);

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
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
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

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("product-images")
      .getPublicUrl(resultPath);

    await supabaseAdmin
      .from("generations")
      .update({ result_url: publicUrlData.publicUrl, status: "completed" })
      .eq("id", generationId);

    await supabaseAdmin
      .from("profiles")
      .update({ credits_remaining: profile.credits_remaining - 1 })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        resultUrl: publicUrlData.publicUrl,
        creditsRemaining: profile.credits_remaining - 1,
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
