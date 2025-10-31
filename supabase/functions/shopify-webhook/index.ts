import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic, x-shopify-shop-domain',
};

async function verifyWebhook(body: string, hmacHeader: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const hashBase64 = btoa(String.fromCharCode(...hashArray));

  return hashBase64 === hmacHeader;
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

    // Get webhook headers
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256');
    const topic = req.headers.get('x-shopify-topic');
    const shopDomain = req.headers.get('x-shopify-shop-domain');

    if (!hmacHeader || !topic || !shopDomain) {
      return new Response('Missing webhook headers', { status: 400, headers: corsHeaders });
    }

    // Read body
    const body = await req.text();

    // Verify webhook signature
    const clientSecret = Deno.env.get('SHOPIFY_CLIENT_SECRET') || '';
    const isValid = await verifyWebhook(body, hmacHeader, clientSecret);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response('Invalid signature', { status: 401, headers: corsHeaders });
    }

    const payload = JSON.parse(body);
    console.log(`Received Shopify webhook: ${topic} from ${shopDomain}`);

    // Get catalog source for this shop
    const { data: catalogSource } = await supabaseClient
      .from('catalog_sources')
      .select('id, workspace_id, access_token')
      .eq('shop_domain', shopDomain)
      .eq('provider', 'shopify')
      .single();

    if (!catalogSource) {
      console.error('Catalog source not found for shop:', shopDomain);
      return new Response('Shop not connected', { status: 404, headers: corsHeaders });
    }

    // Handle different webhook topics
    switch (topic) {
      case 'products/create':
      case 'products/update':
        await handleProductUpdate(supabaseClient, catalogSource, payload);
        break;

      case 'products/delete':
        await handleProductDelete(supabaseClient, catalogSource, payload);
        break;

      case 'inventory_levels/update':
        await handleInventoryUpdate(supabaseClient, catalogSource, payload);
        break;

      default:
        console.log('Unhandled webhook topic:', topic);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleProductUpdate(supabaseClient: any, catalogSource: any, product: any) {
  console.log('Handling product update:', product.id);

  const productRecords = [];

  for (const variant of (product.variants || [])) {
    productRecords.push({
      workspace_id: catalogSource.workspace_id,
      catalog_source_id: catalogSource.id,
      external_id: `gid://shopify/ProductVariant/${variant.id}`,
      shopify_product_id: `gid://shopify/Product/${product.id}`,
      shopify_variant_id: `gid://shopify/ProductVariant/${variant.id}`,
      shopify_inventory_item_id: `gid://shopify/InventoryItem/${variant.inventory_item_id}`,
      sku: variant.sku || '',
      title: product.variants.length > 1 ? `${product.title} - ${variant.title}` : product.title,
      description: product.body_html,
      price: parseFloat(variant.price) || 0,
      compare_at_price: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
      stock: variant.inventory_quantity || 0,
      image_url: product.image?.src || product.images?.[0]?.src,
      image_gallery: product.images?.map((img: any) => ({
        url: img.src,
        alt: img.alt,
      })),
      handle: product.handle,
      vendor: product.vendor,
      product_type: product.product_type,
      tags: product.tags?.split(',').map((t: string) => t.trim()),
      status: product.status === 'active' ? 'active' : 'draft',
      metadata: {
        barcode: variant.barcode,
        weight: variant.weight,
        weight_unit: variant.weight_unit,
      },
    });
  }

  const { error } = await supabaseClient
    .from('products')
    .upsert(productRecords, {
      onConflict: 'workspace_id,external_id',
    });

  if (error) {
    console.error('Product upsert error:', error);
    throw error;
  }
}

async function handleProductDelete(supabaseClient: any, catalogSource: any, product: any) {
  console.log('Handling product delete:', product.id);

  const { error } = await supabaseClient
    .from('products')
    .delete()
    .eq('workspace_id', catalogSource.workspace_id)
    .eq('shopify_product_id', `gid://shopify/Product/${product.id}`);

  if (error) {
    console.error('Product delete error:', error);
    throw error;
  }
}

async function handleInventoryUpdate(supabaseClient: any, catalogSource: any, inventoryLevel: any) {
  console.log('Handling inventory update:', inventoryLevel.inventory_item_id);

  // Fetch product by inventory_item_id
  const { data: products } = await supabaseClient
    .from('products')
    .select('id, inventory_by_location')
    .eq('workspace_id', catalogSource.workspace_id)
    .eq('shopify_inventory_item_id', `gid://shopify/InventoryItem/${inventoryLevel.inventory_item_id}`);

  if (!products || products.length === 0) {
    console.warn('No products found for inventory item:', inventoryLevel.inventory_item_id);
    return;
  }

  for (const product of products) {
    const locationId = `gid://shopify/Location/${inventoryLevel.location_id}`;
    const inventoryByLocation = product.inventory_by_location || {};

    inventoryByLocation[locationId] = {
      name: inventoryByLocation[locationId]?.name || 'Unknown',
      quantity: inventoryLevel.available || 0,
    };

    await supabaseClient
      .from('products')
      .update({ inventory_by_location: inventoryByLocation })
      .eq('id', product.id);
  }
}
