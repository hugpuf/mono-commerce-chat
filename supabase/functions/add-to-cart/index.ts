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
    const { workspaceId, conversationId, product_id, quantity, variant_info } = await req.json();

    if (!workspaceId || !conversationId || !product_id) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: conversation, error: convoError } = await supabase
      .from("conversations")
      .select("workspace_id, cart_items, cart_total")
      .eq("id", conversationId)
      .single();

    if (convoError || !conversation || conversation.workspace_id !== workspaceId) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, title, price, stock, image_url, workspace_id")
      .eq("id", product_id)
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestedQty = quantity || 1;
    if (product.stock < requestedQty) {
      return new Response(
        JSON.stringify({ error: "Insufficient stock", available: product.stock }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cartItems = conversation.cart_items || [];
    const newItem = {
      product_id: product.id,
      title: product.title,
      price: product.price,
      quantity: requestedQty,
      variant_info: variant_info || null,
      image_url: product.image_url,
      added_at: new Date().toISOString()
    };

    const updatedCart = [...cartItems, newItem];
    const newTotal = updatedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        cart_items: updatedCart,
        cart_total: newTotal,
        last_interaction_type: "shopping"
      })
      .eq("id", conversationId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        cart_count: updatedCart.length,
        cart_total: newTotal,
        added_item: newItem
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[add-to-cart] Unexpected error", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unable to add to cart" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
