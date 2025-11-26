import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspaceId, query, category, max_price } = await req.json();

    if (!workspaceId || !query) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await supabase.rpc("exact_search_products", {
      workspace_uuid: workspaceId,
      search_query: query,
      category_filter: category || null,
      max_price_filter: max_price || null,
      result_limit: 5
    });

    if (error) {
      console.error("[search-products] RPC error", error);
      throw error;
    }

    return new Response(
      JSON.stringify({ products: data || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[search-products] Unexpected error", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unable to search products" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
