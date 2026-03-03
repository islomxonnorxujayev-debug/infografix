import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { telegram_id } = await req.json();
    if (!telegram_id) {
      return new Response(JSON.stringify({ error: "telegram_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("telegram_id", telegram_id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get generations
    const { data: generations } = await supabase
      .from("generations")
      .select("id, result_url, original_url, marketplace, style_preset, status, created_at")
      .eq("telegram_id", telegram_id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Get payment requests
    const { data: payments } = await supabase
      .from("payment_requests")
      .select("id, package_name, credits, amount, status, created_at")
      .eq("telegram_id", telegram_id)
      .order("created_at", { ascending: false })
      .limit(20);

    return new Response(JSON.stringify({
      profile: {
        first_name: profile.first_name,
        telegram_username: profile.telegram_username,
        credits_remaining: profile.credits_remaining,
        plan: profile.plan,
        created_at: profile.created_at,
      },
      generations: generations || [],
      payments: payments || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
