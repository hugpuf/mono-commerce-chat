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
    const { workspaceId, conversationId } = await req.json();

    if (!workspaceId || !conversationId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: conversation, error } = await supabase
      .from("conversations")
      .select("workspace_id, cart_items, cart_total")
      .eq("id", conversationId)
      .single();

    if (error || !conversation || conversation.workspace_id !== workspaceId) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        items: conversation.cart_items || [],
        total: conversation.cart_total || 0,
        count: conversation.cart_items?.length || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[view-cart] Unexpected error", error);
    const errorMessage = error instanceof Error ? error.message : "Unable to view cart";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
