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
      console.error("Missing env vars");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth
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

    // Check credits
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

    const { imageUrl, marketplace, marketplaceRatio, marketplaceSize, generationId } = await req.json();

    if (!imageUrl || !generationId) {
      return new Response(JSON.stringify({ error: "Missing imageUrl or generationId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build dynamic, category-aware marketplace promotional image prompt
    const prompt = `You are the #1 e-commerce creative designer in the world. Your images consistently generate 3x more clicks and sales than competitors. 

TASK: Analyze this product image. Identify its category (fashion, electronics, home, beauty, sports, food, toys, etc.) and create a PREMIUM promotional marketplace image that will MAXIMIZE sales on ${marketplace || "e-commerce"}.

ADAPT THE ENTIRE DESIGN BASED ON PRODUCT CATEGORY:

FOR FASHION/CLOTHING/ACCESSORIES:
- Feature an attractive model wearing or holding the product naturally
- Use a lifestyle setting: urban street, studio, or trendy interior
- Warm, fashionable color palette with soft lighting
- Add style-related text badges: material, size range, season

FOR ELECTRONICS/GADGETS/TECH:
- Sleek, futuristic dark or gradient background with neon accents and tech-feel lighting
- Show the device from multiple angles or in an exploded view
- Add specification callouts with clean icons
- Hands or desk scene showing the product in use

FOR HOME/KITCHEN/FURNITURE:
- Cozy, warm interior scene as background
- Product placed in a realistic room setting
- Earthy, warm color tones with natural light feel
- Lifestyle composition showing comfort and quality

FOR BEAUTY/COSMETICS/HEALTH:
- Elegant, luxurious gradient background (rose gold, pearl, soft pink, lavender)
- Close-up beauty shot with model applying or holding the product
- Dewy, fresh, premium feel with sparkle effects
- Ingredient or benefit callouts

FOR SPORTS/FITNESS:
- Dynamic, energetic background with motion blur or action effects
- Athletic model using the product mid-workout
- Bold, energetic colors (electric blue, neon green, fiery orange)
- Performance stats or feature badges

FOR KIDS/TOYS:
- Bright, playful, colorful background with fun patterns
- Happy child or family interaction with the product
- Cartoon-style decorative elements, stars, bubbles
- Age range and safety badges

FOR ALL CATEGORIES — MANDATORY RULES:

1. BACKGROUND: Category-specific creative background. EACH image must have a UNIQUE color scheme and style. Vary between: gradient backgrounds, lifestyle scenes, abstract geometric, bokeh, textured surfaces. Pick what fits the product best.

2. PRODUCT: Extract cleanly. Show it large, sharp, well-lit. Add professional studio lighting with highlights and depth. Product accuracy is paramount — exact colors, textures, proportions.

3. HUMAN ELEMENT: Include a person using, wearing, holding, or demonstrating the product. Position them naturally in the composition. If a full model is inappropriate, show hands interacting with the product, or the product in a lifestyle context.

4. TYPOGRAPHY: Add the product name/category as bold, modern text. Use ${marketplace === "Uzum Market" || marketplace === "Wildberries" || marketplace === "Ozon" ? "Russian" : "English"} language. Include 2-3 benefit badges. Make text readable and professionally styled with shadows or outlines for contrast.

5. COMPOSITION (${marketplaceRatio || "1:1"}, ${marketplaceSize || "1080x1080"}):
   - Layered layout: background → lifestyle/model → product closeup → text overlay
   - Product fills 40-60% of frame, model/lifestyle 30-40%, text 10-20%
   - Professional balance that draws the eye to the product first

6. SALES PSYCHOLOGY: The image must trigger an immediate desire to buy. Use premium feel, social proof elements (rating stars, bestseller badges), and urgency cues. Make the viewer think: "I need this."

FINAL OUTPUT: A scroll-stopping, category-optimized promotional image for ${marketplace || "any marketplace"} that looks like it was designed by a premium agency. Include creative themed background, human model/lifestyle element, product showcase, and sales-driving text. Every image you create must look DIFFERENT from the last — vary colors, layouts, and styles based on the product.`;

    console.log("Calling AI for generation:", generationId, "marketplace:", marketplace);

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
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI krediti tugadi. Qo'llab-quvvatlash xizmatiga murojaat qiling." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI rasmni qayta ishlashda xatolik yuz berdi" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();

    // Check for rate limit error embedded in the response
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

    // Upload result
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

    // Update generation record
    await supabaseAdmin
      .from("generations")
      .update({ result_url: publicUrlData.publicUrl, status: "completed" })
      .eq("id", generationId);

    // Deduct credit
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
