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
    const { workspaceId, conversationId, order_number } = await req.json();

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
      .select("workspace_id, customer_phone")
      .eq("id", conversationId)
      .single();

    if (error || !conversation || conversation.workspace_id !== workspaceId) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let query = supabase
      .from("orders")
      .select("order_number, status, payment_status, total, tracking_number, created_at")
      .eq("workspace_id", workspaceId)
      .eq("customer_phone", conversation.customer_phone)
      .order("created_at", { ascending: false });

    if (order_number) {
      query = query.eq("order_number", order_number);
    }

    const { data: orders, error: ordersError } = await query.limit(1);

    if (ordersError) {
      throw ordersError;
    }

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({ error: "No orders found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const order = orders[0];
    return new Response(
      JSON.stringify({
        order_number: order.order_number,
        status: order.status,
        payment_status: order.payment_status,
        total: order.total,
        tracking_number: order.tracking_number || null,
        created_at: order.created_at
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[check-order-status] Unexpected error", error);
    const errorMessage = error instanceof Error ? error.message : "Unable to check order status";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
