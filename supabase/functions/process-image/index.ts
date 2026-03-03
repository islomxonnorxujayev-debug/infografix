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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error("Missing env vars:", { url: !!supabaseUrl, serviceKey: !!supabaseServiceKey, anonKey: !!supabaseAnonKey });
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check credits
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.credits_remaining <= 0) {
      return new Response(JSON.stringify({ error: "No credits remaining. Please upgrade your plan." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageUrl, marketplace, stylePreset, enhancements, generationId } = await req.json();

    if (!imageUrl || !generationId) {
      return new Response(JSON.stringify({ error: "Missing imageUrl or generationId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the AI prompt
    const enabledEnhancements = Object.entries(enhancements || {})
      .filter(([_, v]) => v)
      .map(([k]) => k);

    const prompt = `You are a professional product photography AI. Transform this product image into a high-quality, marketplace-ready professional product photo.

Style: ${stylePreset || "Clean White Studio"}
Target marketplace: ${marketplace || "Universal"}

Requirements:
- Remove the original background completely
- Apply "${stylePreset || "Clean White Studio"}" style
- Professional studio lighting simulation
- Natural soft shadow generation
- Maintain realistic product texture - NO cartoon or over-processed look
- Commercial e-commerce photography style
${enabledEnhancements.length > 0 ? `\nAdditional enhancements:\n${enabledEnhancements.map(e => `- ${e}`).join('\n')}` : ''}

Create a clean, professional product photo that looks like it was taken in a real photography studio. The result must be suitable for ${marketplace || "e-commerce"} marketplace listings.`;

    console.log("Calling AI with prompt for generation:", generationId);

    // Call Lovable AI with image editing
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
      console.error("AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const resultImageBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!resultImageBase64) {
      console.error("No image in AI response:", JSON.stringify(aiData).slice(0, 500));
      return new Response(JSON.stringify({ error: "AI did not return an image. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload the result image to storage
    const base64Data = resultImageBase64.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const resultPath = `${user.id}/results/${generationId}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("product-images")
      .upload(resultPath, binaryData, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to save result image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
