import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkImportRequest {
  catalogSourceId: string;
  workspaceId: string;
  collectionIds?: string[]; // Optional: only import specific collections
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

    const { catalogSourceId, workspaceId, collectionIds }: BulkImportRequest = await req.json();

    // Get catalog source with access token
    const { data: catalogSource, error: sourceError } = await supabaseClient
      .from('catalog_sources')
      .select('shop_domain, access_token, api_version')
      .eq('id', catalogSourceId)
      .single();

    if (sourceError || !catalogSource) {
      throw new Error('Catalog source not found');
    }

    const { shop_domain, access_token } = catalogSource;

    console.log('Starting Shopify bulk import for', shop_domain);

    // Build GraphQL query
    let productsQuery = `
      {
        products(first: 250) {
          edges {
            node {
              id
              title
              status
              handle
              vendor
              productType
              tags
              descriptionHtml
              options { name values }
              images(first: 50) { edges { node { originalSrc altText } } }
              variants(first: 250) {
                edges {
                  node {
                    id
                    sku
                    title
                    price
                    compareAtPrice
                    barcode
                    weight
                    weightUnit
                    inventoryItem { id }
                    inventoryQuantity
                  }
                }
              }
            }
          }
        }
      }
    `;

    // Initiate bulk operation
    const bulkResponse = await fetch(
      `https://${shop_domain}/admin/api/2024-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation {
              bulkOperationRunQuery(
                query: """${productsQuery}"""
              ) {
                bulkOperation {
                  id
                  status
                  objectCount
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `,
        }),
      }
    );

    const bulkResult = await bulkResponse.json();

    if (bulkResult.data?.bulkOperationRunQuery?.userErrors?.length > 0) {
      console.error('Bulk operation errors:', bulkResult.data.bulkOperationRunQuery.userErrors);
      throw new Error('Failed to start bulk operation');
    }

    const bulkOpId = bulkResult.data?.bulkOperationRunQuery?.bulkOperation?.id;
    console.log('Bulk operation started:', bulkOpId);

    // Poll for completion (simplified - in production, use webhooks)
    let completed = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let downloadUrl = null;

    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;

      const statusResponse = await fetch(
        `https://${shop_domain}/admin/api/2024-10/graphql.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': access_token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              query {
                node(id: "${bulkOpId}") {
                  ... on BulkOperation {
                    id
                    status
                    errorCode
                    objectCount
                    url
                  }
                }
              }
            `,
          }),
        }
      );

      const statusResult = await statusResponse.json();
      const bulkOp = statusResult.data?.node;

      console.log(`Bulk operation status (attempt ${attempts}):`, bulkOp?.status);

      if (bulkOp?.status === 'COMPLETED') {
        completed = true;
        downloadUrl = bulkOp.url;
      } else if (bulkOp?.status === 'FAILED' || bulkOp?.errorCode) {
        throw new Error(`Bulk operation failed: ${bulkOp?.errorCode}`);
      }
    }

    if (!downloadUrl) {
      throw new Error('Bulk operation timed out');
    }

    // Download and process JSONL
    console.log('Downloading bulk operation results...');
    const dataResponse = await fetch(downloadUrl);
    const jsonlText = await dataResponse.text();
    const lines = jsonlText.trim().split('\n');

    const products: any[] = [];
    let currentProduct: any = null;

    for (const line of lines) {
      const obj = JSON.parse(line);

      if (obj.__parentId) {
        // This is a child object (variant, image, etc.)
        if (obj.id?.includes('ProductVariant')) {
          if (currentProduct) {
            if (!currentProduct.variants) currentProduct.variants = [];
            currentProduct.variants.push(obj);
          }
        } else if (obj.originalSrc) {
          // Image
          if (currentProduct) {
            if (!currentProduct.images) currentProduct.images = [];
            currentProduct.images.push(obj);
          }
        }
      } else {
        // This is a product
        if (currentProduct) {
          products.push(currentProduct);
        }
        currentProduct = obj;
      }
    }
    if (currentProduct) products.push(currentProduct);

    console.log(`Processed ${products.length} products`);

    // Insert products into database
    const productRecords = [];

    for (const product of products) {
      // Fetch inventory for all variants
      const variantIds = product.variants?.map((v: any) => v.inventoryItem?.id).filter(Boolean) || [];
      
      let inventoryByLocation: any = {};

      if (variantIds.length > 0) {
        // Fetch inventory levels for all variants
        for (const inventoryItemId of variantIds) {
          const invResponse = await fetch(
            `https://${shop_domain}/admin/api/2024-10/graphql.json`,
            {
              method: 'POST',
              headers: {
                'X-Shopify-Access-Token': access_token,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                query: `
                  query {
                    inventoryItem(id: "${inventoryItemId}") {
                      inventoryLevels(first: 50) {
                        edges {
                          node {
                            location { id name }
                            quantities(names: "available") {
                              quantity
                            }
                          }
                        }
                      }
                    }
                  }
                `,
              }),
            }
          );

          const invResult = await invResponse.json();
          const levels = invResult.data?.inventoryItem?.inventoryLevels?.edges || [];

          for (const level of levels) {
            const locationId = level.node.location.id;
            const qty = level.node.quantities[0]?.quantity || 0;
            
            if (!inventoryByLocation[locationId]) {
              inventoryByLocation[locationId] = {
                name: level.node.location.name,
                quantity: 0,
              };
            }
            inventoryByLocation[locationId].quantity += qty;
          }
        }
      }

      // Create product records for each variant
      for (const variant of (product.variants || [])) {
        productRecords.push({
          workspace_id: workspaceId,
          catalog_source_id: catalogSourceId,
          external_id: variant.id,
          shopify_product_id: product.id,
          shopify_variant_id: variant.id,
          shopify_inventory_item_id: variant.inventoryItem?.id,
          sku: variant.sku || '',
          title: product.variants.length > 1 ? `${product.title} - ${variant.title}` : product.title,
          description: product.descriptionHtml,
          price: parseFloat(variant.price) || 0,
          compare_at_price: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null,
          stock: variant.inventoryQuantity || 0,
          image_url: product.images?.[0]?.originalSrc,
          image_gallery: product.images?.map((img: any) => ({
            url: img.originalSrc,
            alt: img.altText,
          })),
          handle: product.handle,
          vendor: product.vendor,
          product_type: product.productType,
          tags: product.tags,
          status: product.status === 'ACTIVE' ? 'active' : 'draft',
          metadata: {
            barcode: variant.barcode,
            weight: variant.weight,
            weight_unit: variant.weightUnit,
            options: product.options,
          },
          inventory_by_location: inventoryByLocation,
          variant_options: product.variants.length > 1 ? {
            [variant.title]: variant.title,
          } : null,
        });
      }
    }

    // Batch upsert products
    const batchSize = 50;
    for (let i = 0; i < productRecords.length; i += batchSize) {
      const batch = productRecords.slice(i, i + batchSize);
      
      const { error: upsertError } = await supabaseClient
        .from('products')
        .upsert(batch, {
          onConflict: 'workspace_id,external_id',
        });

      if (upsertError) {
        console.error('Batch upsert error:', upsertError);
        throw upsertError;
      }
    }

    // Update catalog source sync status
    await supabaseClient
      .from('catalog_sources')
      .update({
        last_sync_at: new Date().toISOString(),
        status: 'synced',
      })
      .eq('id', catalogSourceId);

    console.log(`Successfully imported ${productRecords.length} product variants`);

    return new Response(
      JSON.stringify({
        success: true,
        productsImported: productRecords.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Bulk import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
