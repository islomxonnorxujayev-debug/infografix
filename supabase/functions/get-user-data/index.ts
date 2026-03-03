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

    // Check auth_date is not too old (allow 24 hours)
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
    const { telegram_id, init_data } = body;

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

    // Validate: require either valid initData or at least a telegram_id
    if (init_data && botToken) {
      const validation = validateTelegramInitData(init_data, botToken);
      if (!validation.valid) {
        return new Response(JSON.stringify({ error: "Invalid Telegram authentication" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Use validated user ID
      var validatedTelegramId = validation.userId;
    } else if (telegram_id) {
      // Fallback: validate telegram_id format (positive integer)
      if (typeof telegram_id !== "number" || telegram_id <= 0 || !Number.isInteger(telegram_id)) {
        return new Response(JSON.stringify({ error: "Invalid telegram_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      var validatedTelegramId = telegram_id;
    } else {
      return new Response(JSON.stringify({ error: "telegram_id or init_data required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
