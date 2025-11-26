import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-n8n-secret"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate n8n secret
  const n8nSecret = req.headers.get("x-n8n-secret");
  const expectedSecret = Deno.env.get("N8N_TOOL_SECRET");
  
  if (!n8nSecret || n8nSecret !== expectedSecret) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { workspaceId, limit } = await req.json();

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const pageSize = limit || 5;
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, title, description, price, stock, image_url, tags")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .gt("stock", 0)
      .order("created_at", { ascending: false })
      .limit(pageSize);

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ products: data || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[browse-catalog] Unexpected error", error);
    const errorMessage = error instanceof Error ? error.message : "Unable to browse catalog";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
