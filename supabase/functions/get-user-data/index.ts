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
    const body = await req.json();
    const { init_data } = body;

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

    const validatedTelegramId = validation.userId;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("telegram_id", validatedTelegramId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: generations } = await supabase
      .from("generations")
      .select("id, result_url, original_url, marketplace, style_preset, status, created_at")
      .eq("telegram_id", validatedTelegramId)
      .order("created_at", { ascending: false })
      .limit(50);

    // Resolve storage paths to signed URLs
    const resolvedGenerations = await Promise.all(
      (generations || []).map(async (g: any) => {
        const resolveUrl = async (path: string | null) => {
          if (!path || path.startsWith("http")) return path;
          const { data } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24);
          return data?.signedUrl || path;
        };
        return {
          ...g,
          result_url: await resolveUrl(g.result_url),
          original_url: await resolveUrl(g.original_url),
        };
      })
    );

    const { data: payments } = await supabase
      .from("payment_requests")
      .select("id, package_name, credits, amount, status, created_at")
      .eq("telegram_id", validatedTelegramId)
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
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
