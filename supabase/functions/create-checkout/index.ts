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
      .select("id, workspace_id, cart_items, cart_total, customer_phone, customer_name")
      .eq("id", conversationId)
      .single();

    if (error || !conversation || conversation.workspace_id !== workspaceId) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!conversation.cart_items || conversation.cart_items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Cart is empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: orderNumber, error: orderNumberError } = await supabase.rpc("generate_order_number");
    if (orderNumberError) {
      throw orderNumberError;
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        workspace_id: conversation.workspace_id,
        conversation_id: conversation.id,
        customer_phone: conversation.customer_phone,
        customer_name: conversation.customer_name,
        order_number: orderNumber,
        items: conversation.cart_items,
        subtotal: conversation.cart_total,
        total: conversation.cart_total,
        status: "pending",
        payment_status: "pending"
      })
      .select()
      .single();

    if (orderError || !order) {
      throw orderError;
    }

    const paymentLink = `https://pay.stripe.com/test-link-${order.id}`;

    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({
        payment_link_url: paymentLink,
        payment_link_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .eq("id", order.id);

    if (updateOrderError) {
      throw updateOrderError;
    }

    const { error: clearCartError } = await supabase
      .from("conversations")
      .update({ cart_items: [], cart_total: 0, last_interaction_type: "checkout" })
      .eq("id", conversation.id);

    if (clearCartError) {
      throw clearCartError;
    }

    return new Response(
      JSON.stringify({ success: true, order_number: orderNumber, payment_link: paymentLink, total: conversation.cart_total }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[create-checkout] Unexpected error", error);
    const errorMessage = error instanceof Error ? error.message : "Unable to create checkout";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
