import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storagePath } = await req.json();

    if (!storagePath || typeof storagePath !== "string") {
      return new Response(JSON.stringify({ error: "storagePath required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Generate a short-lived signed URL
    const { data: signedData, error: signedError } = await supabase.storage
      .from("product-images")
      .createSignedUrl(storagePath, 60); // 1 minute

    if (signedError || !signedData?.signedUrl) {
      return new Response(JSON.stringify({ error: "Failed to create signed URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the file server-side (no CORS restrictions)
    const fileResponse = await fetch(signedData.signedUrl);
    if (!fileResponse.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileBlob = await fileResponse.blob();

    return new Response(fileBlob, {
      headers: {
        ...corsHeaders,
        "Content-Type": fileResponse.headers.get("Content-Type") || "image/png",
        "Content-Disposition": `attachment; filename="infografix-${Date.now()}.png"`,
      },
    });
  } catch (e) {
    console.error("download-proxy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
