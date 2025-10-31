import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdjustInventoryRequest {
  workspaceId: string;
  productId: string;
  quantity: number;
  reason: 'sale' | 'reservation' | 'return' | 'correction';
  orderId?: string;
  conversationId?: string;
  idempotencyKey: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const {
      workspaceId,
      productId,
      quantity,
      reason,
      idempotencyKey,
    }: AdjustInventoryRequest = await req.json();

    console.log(`Adjusting inventory: product=${productId}, qty=${quantity}, reason=${reason}`);

    // Check idempotency
    const { data: existingAdjustment } = await supabaseClient
      .from('audit_logs')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('action', 'shopify_inventory_adjust')
      .eq('target_id', productId)
      .eq('ip_address', idempotencyKey) // Reusing this field for idempotency key
      .single();

    if (existingAdjustment) {
      console.log('Idempotent request - already processed');
      return new Response(
        JSON.stringify({ success: true, alreadyProcessed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get product with Shopify IDs
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('*, catalog_sources!inner(shop_domain, access_token)')
      .eq('id', productId)
      .eq('workspace_id', workspaceId)
      .single();

    if (productError || !product) {
      throw new Error('Product not found');
    }

    if (!product.shopify_inventory_item_id) {
      throw new Error('Product is not a Shopify product');
    }

    const { shop_domain, access_token } = product.catalog_sources;

    // Get all locations for this product
    const inventoryByLocation = product.inventory_by_location || {};
    const locationIds = Object.keys(inventoryByLocation);

    if (locationIds.length === 0) {
      throw new Error('No locations found for product');
    }

    // Determine allocation strategy (sum across all locations)
    // For now, we'll deduct from the first available location with stock
    let remainingQty = quantity;
    const adjustments = [];

    for (const locationId of locationIds) {
      const locationData = inventoryByLocation[locationId];
      const availableQty = locationData.quantity || 0;

      if (availableQty > 0 && remainingQty > 0) {
        const toDeduct = Math.min(availableQty, remainingQty);
        const newQty = availableQty - toDeduct;

        adjustments.push({
          locationId,
          inventoryItemId: product.shopify_inventory_item_id,
          newQuantity: Math.max(0, newQty),
        });

        remainingQty -= toDeduct;

        if (remainingQty === 0) break;
      }
    }

    if (remainingQty > 0) {
      console.warn(`Insufficient inventory. Requested: ${quantity}, Available: ${quantity - remainingQty}`);
    }

    // Execute Shopify adjustments
    const results = [];

    for (const adjustment of adjustments) {
      const mutation = `
        mutation {
          inventorySetOnHandQuantities(
            input: {
              reason: "${reason.toUpperCase()}"
              sets: [{
                inventoryItemId: "${adjustment.inventoryItemId}"
                locationId: "${adjustment.locationId}"
                onHandQuantity: ${adjustment.newQuantity}
              }]
            }
          ) {
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await fetch(
        `https://${shop_domain}/admin/api/2024-10/graphql.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': access_token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: mutation }),
        }
      );

      const result = await response.json();

      if (result.data?.inventorySetOnHandQuantities?.userErrors?.length > 0) {
        console.error('Shopify inventory adjustment errors:', result.data.inventorySetOnHandQuantities.userErrors);
        throw new Error('Failed to adjust Shopify inventory');
      }

      results.push({
        locationId: adjustment.locationId,
        newQuantity: adjustment.newQuantity,
      });

      // Update local inventory
      inventoryByLocation[adjustment.locationId].quantity = adjustment.newQuantity;
    }

    // Update local product inventory
    await supabaseClient
      .from('products')
      .update({ inventory_by_location: inventoryByLocation })
      .eq('id', productId);

    // Log the adjustment for idempotency
    await supabaseClient
      .from('audit_logs')
      .insert({
        workspace_id: workspaceId,
        action: 'shopify_inventory_adjust',
        target_type: 'product',
        target_id: productId,
        ip_address: idempotencyKey, // Reusing for idempotency key
        before_state: { inventory_by_location: product.inventory_by_location },
        after_state: { inventory_by_location: inventoryByLocation },
      });

    console.log('Inventory adjustment successful:', results);

    return new Response(
      JSON.stringify({
        success: true,
        adjustments: results,
        remainingShortage: remainingQty,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Inventory adjustment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
