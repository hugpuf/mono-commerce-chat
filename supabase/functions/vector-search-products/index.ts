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

  // Validate authentication (n8n secret OR service role key)
  const n8nSecret = req.headers.get("x-n8n-secret");
  const expectedSecret = Deno.env.get("N8N_TOOL_SECRET");
  const authHeader = req.headers.get("authorization");
  
  const isN8nAuth = n8nSecret && n8nSecret === expectedSecret;
  const isServiceRoleAuth = authHeader?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "INVALID");
  
  if (!isN8nAuth && !isServiceRoleAuth) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { 
      workspaceId, 
      embedding, 
      searchQuery,
      matchThreshold = 0.7,
      matchCount = 10,
      category,
      maxPrice,
      searchType = 'vector' // 'vector' or 'hybrid'
    } = await req.json();

    if (!workspaceId || !embedding || !Array.isArray(embedding)) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: workspaceId and embedding array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate embedding dimension (OpenAI text-embedding-3-small = 1536 dimensions)
    if (embedding.length !== 1536) {
      return new Response(
        JSON.stringify({ error: `Invalid embedding dimension: expected 1536, got ${embedding.length}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let data, error;

    if (searchType === 'hybrid' && searchQuery) {
      // Hybrid search: combines keyword + vector search
      console.log("[vector-search-products] Performing hybrid search", { 
        workspaceId, 
        searchQuery,
        hasEmbedding: true,
        matchCount 
      });

      const result = await supabase.rpc("hybrid_search_products", {
        workspace_uuid: workspaceId,
        search_query: searchQuery,
        query_embedding: `[${embedding.join(',')}]`,
        category_filter: category || null,
        max_price_filter: maxPrice || null,
        result_limit: matchCount
      });

      data = result.data;
      error = result.error;
    } else {
      // Pure vector search
      console.log("[vector-search-products] Performing vector search", { 
        workspaceId, 
        matchThreshold,
        matchCount 
      });

      const result = await supabase.rpc("vector_search_products", {
        workspace_uuid: workspaceId,
        query_embedding: `[${embedding.join(',')}]`,
        match_threshold: matchThreshold,
        match_count: matchCount
      });

      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("[vector-search-products] RPC error", error);
      throw error;
    }

    console.log("[vector-search-products] Found products", { 
      count: data?.length || 0,
      searchType 
    });

    return new Response(
      JSON.stringify({ 
        products: data || [],
        searchType,
        resultsCount: data?.length || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[vector-search-products] Unexpected error", error);
    const errorMessage = error instanceof Error ? error.message : "Unable to search products";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
