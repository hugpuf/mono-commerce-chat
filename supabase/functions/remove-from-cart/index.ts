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
    const { workspaceId, conversationId, product_id } = await req.json();

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

    const { data: conversation, error } = await supabase
      .from("conversations")
      .select("workspace_id, cart_items")
      .eq("id", conversationId)
      .single();

    if (error || !conversation || conversation.workspace_id !== workspaceId) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cartItems = conversation.cart_items || [];
    const updatedCart = cartItems.filter((item: any) => item.product_id !== product_id);
    const newTotal = updatedCart.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

    const { error: updateError } = await supabase
      .from("conversations")
      .update({ cart_items: updatedCart, cart_total: newTotal })
      .eq("id", conversationId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, cart_count: updatedCart.length, cart_total: newTotal }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[remove-from-cart] Unexpected error", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unable to remove from cart" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
