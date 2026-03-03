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
    const langName = language === "ru" ? "Russian" : "Uzbek";

    const sceneInstructions: Record<string, string> = {
      nature: `SCENE: Stunning outdoor nature setting. Think top Wildberries/Pinterest product shoots. Lush garden, sunlit forest clearing, tropical beach at golden hour, or blooming meadow. Natural sunlight with warm golden tones, volumetric light rays, lens flare. Shallow depth of field with creamy bokeh on background foliage.`,
      lifestyle: `SCENE: High-end lifestyle environment — the kind you see in Pinterest trending product photos. Modern Scandinavian apartment, artisan coffee shop, designer kitchen, luxury bathroom, or cozy reading nook. The scene tells a compelling story about the product in real life. Warm ambient lighting with subtle window light and shadows. Rich textures: marble, wood, linen, ceramics.`,
      studio: `SCENE: World-class commercial studio photography. Seamless gradient backdrop (alternate between: warm cream, cool gray, blush pink, sage green, deep navy). Three-point lighting: key light at 45°, soft fill, dramatic rim/hair light creating a luminous edge glow. Reflective surface below for subtle mirror effect. Think Wildberries bestseller hero images.`,
      minimalist: `SCENE: Ultra-premium minimalist composition — editorial magazine quality. Clean solid backdrop or whisper-soft gradient. Ample negative space. Subtle geometric accents (thin gold lines, floating shapes). One or two carefully chosen complementary props (a leaf, a fabric swatch, a stone). The product floats in a serene, luxurious void. Soft diffused lighting with no harsh shadows.`,
      infographic: `SCENE: Professional marketplace infographic card — like top-rated Wildberries/Ozon listings. Clean white or light gradient background. Structured layout with:
- Product as the hero center element
- 3-4 key feature callouts with icons and short text labels (in ${langName})
- Benefit badges (e.g. ✓ quality marks, ratings, certifications)
- Clean typography hierarchy: bold headline, supporting subtext
- Thin divider lines or subtle containers for visual structure
- All text and labels MUST be in ${langName}
Think: the product card that gets the highest click-through rate on a marketplace.`,
    };

    const modelInstructions = withModel
      ? `HUMAN MODEL: Include a photorealistic, attractive model naturally using/wearing/holding the product. The model's pose, expression, and styling should match a high-budget commercial campaign (think Zara, H&M, or Wildberries top sellers). The product must remain the focal point — the model enhances the story but doesn't dominate. Correct anatomical proportions. Natural skin texture and lighting on the model.`
      : `NO HUMAN MODEL: Product-only composition. Use creative commercial photography techniques: dynamic angles (3/4 view, slight tilt), artistic shadows, complementary lifestyle props that add context without cluttering. The product is the sole hero — make it look irresistible through lighting and composition alone.`;

    const prompt = `You are an elite e-commerce product photographer whose images consistently achieve top conversion rates on Wildberries, Pinterest, and premium marketplaces.

CREATE a scroll-stopping, purchase-driving product image.

OUTPUT: Exactly 1080×1440 pixels (3:4 portrait ratio). High-resolution, no artifacts, no blur.

STEP 1 — PRODUCT ANALYSIS:
Study the uploaded product image meticulously:
- What category is it? (apparel, cosmetics, electronics, home goods, food, accessories, etc.)
- What are its REAL-WORLD physical dimensions? (A ring is 2cm, a phone is 15cm, a jacket is 70cm, a sofa is 200cm)
- What are its key selling features? (texture, color, material, brand elements)
This analysis drives EVERYTHING below.

${sceneInstructions[sceneType] || sceneInstructions.studio}

${modelInstructions}

STEP 2 — PRODUCT SIZE & SCALE (CRITICAL):
- The product MUST appear at its CORRECT real-world size relative to all other elements
- With a model: a watch fits a wrist, shoes fit feet, a bag hangs from a shoulder at realistic scale. NEVER enlarge small products to fill the frame — instead use tighter framing/cropping
- Without a model: use environmental props as scale anchors (table, shelf, hand silhouette, ruler-like elements). A lipstick should look small next to a mirror. A sofa should dominate the frame.
- Product should occupy 20-40% of the frame maximum. The remaining 60-80% is scene, breathing space, and context.
- WRONG: Product stretched to fill entire frame, ignoring real proportions
- RIGHT: Product at natural size within a beautifully composed scene

STEP 3 — LIGHTING & COLOR:
- Three-point professional lighting minimum
- Color grading: cinematic, warm, or moody depending on scene — NOT flat or overexposed
- Product colors must be TRUE TO ORIGINAL — do not alter the product's actual colors
- Subtle vignette to draw focus to center
- No color banding, no harsh transitions

STEP 4 — COMMERCIAL DESIGN ELEMENTS (all text in ${langName}):
- Add 1-2 elegant text overlays: product category or a short compelling tagline in ${langName}
- Include subtle quality indicators: a small rating badge, a "TOP" or "HIT" label, or a material/quality icon
- Typography: modern, clean, high contrast against background
- Do NOT clutter — every element must serve a purpose
- For infographic style: follow a structured card layout with clear visual hierarchy

STEP 5 — FINAL QUALITY CHECK:
- Is the product at correct real-world scale? 
- Would this image be the #1 bestseller hero image on Wildberries?
- Does it look like a $5,000 photoshoot, not an AI generation?
- Are all visible texts in ${langName}?
- Is the composition balanced with proper breathing room?

VARIETY: Each generation must feel unique — vary lighting angle, color palette, camera angle, and styling details.`;

    console.log("Generating:", generationId, "model:", modelType, "scene:", sceneType, "lang:", language);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
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
