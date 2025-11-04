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

  // Parse request body once to avoid "Body already consumed" error
  let parsed: BulkImportRequest;
  try {
    parsed = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { catalogSourceId, workspaceId, collectionIds } = parsed;

  try {
    if (!catalogSourceId || !workspaceId) {
      throw new Error('Missing catalogSourceId or workspaceId');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const startTime = Date.now();
    console.log('📥 Bulk import request received:', {
      catalogSourceId,
      workspaceId,
      timestamp: new Date().toISOString()
    });

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

    console.log('🏪 Catalog source details:', {
      id: catalogSourceId,
      shop_domain,
      source_type: 'shopify',
      access_token_preview: access_token ? access_token.substring(0, 8) + '***' : 'MISSING'
    });

    // Build GraphQL query with updated fields for API 2024-10
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
              images(first: 50) { edges { node { url altText } } }
              variants(first: 250) {
                edges {
                  node {
                    id
                    sku
                    title
                    price
                    compareAtPrice
                    barcode
                    inventoryQuantity
                    inventoryItem {
                      id
                      measurement {
                        weight { value unit }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    console.log('📤 Initiating bulk operation:', {
      shop_domain,
      api_version: '2024-10',
      query_length: productsQuery.length,
      query_preview: productsQuery.substring(0, 100).replace(/\s+/g, ' ') + '...'
    });

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

    console.log('📊 Bulk operation response:', {
      http_status: bulkResponse.status,
      http_status_text: bulkResponse.statusText,
      has_data: !!bulkResult.data,
      has_errors: !!bulkResult.errors,
      user_errors_count: bulkResult.data?.bulkOperationRunQuery?.userErrors?.length || 0
    });

    if (bulkResult.errors) {
      console.error('❌ GraphQL errors on bulk op start:', JSON.stringify(bulkResult.errors, null, 2));
    }

    if (bulkResult.data?.bulkOperationRunQuery?.userErrors?.length > 0) {
      console.error('❌ User errors:', JSON.stringify(bulkResult.data.bulkOperationRunQuery.userErrors, null, 2));
      throw new Error('Failed to start bulk operation: ' + JSON.stringify(bulkResult.data.bulkOperationRunQuery.userErrors));
    }

    const bulkOpId = bulkResult.data?.bulkOperationRunQuery?.bulkOperation?.id;
    const initialStatus = bulkResult.data?.bulkOperationRunQuery?.bulkOperation?.status;
    
    console.log('✅ Bulk operation initiated:', {
      bulkOpId,
      initial_status: initialStatus,
      initial_object_count: bulkResult.data?.bulkOperationRunQuery?.bulkOperation?.objectCount || 0
    });

    // Poll for completion (simplified - in production, use webhooks)
    let completed = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let downloadUrl = null;

    while (!completed && attempts < maxAttempts) {
      // Check for cancellation before waiting
      const { data: sourceCheck } = await supabaseClient
        .from('catalog_sources')
        .select('sync_status, cancellation_requested_at')
        .eq('id', catalogSourceId)
        .single();

      if (sourceCheck?.sync_status === 'cancelled' || sourceCheck?.cancellation_requested_at) {
        console.log('Sync cancelled by user');
        return new Response(
          JSON.stringify({ success: false, message: 'Sync cancelled by user' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;

      console.log(`🔄 Polling attempt ${attempts}/${maxAttempts}:`, {
        bulkOpId,
        elapsed_seconds: attempts * 5
      });

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

      console.log('📡 Status check response:', {
        attempt: attempts,
        http_status: statusResponse.status,
        http_status_text: statusResponse.statusText,
        operation_status: bulkOp?.status,
        error_code: bulkOp?.errorCode || null,
        object_count: bulkOp?.objectCount || 0,
        has_download_url: !!bulkOp?.url
      });

      if (statusResult.errors) {
        console.error('❌ GraphQL errors during polling:', JSON.stringify(statusResult.errors, null, 2));
        console.error('🔍 Full status result:', JSON.stringify(statusResult, null, 2));
      }

      if (!bulkOp) {
        console.error('⚠️ No bulk operation node in response:', JSON.stringify(statusResult, null, 2));
      }

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
    console.log('📥 Downloading JSONL from:', downloadUrl);
    const dataResponse = await fetch(downloadUrl);
    const jsonlText = await dataResponse.text();
    const lines = jsonlText.trim().split('\n');
    
    console.log('📄 JSONL file stats:', {
      size_bytes: jsonlText.length,
      total_lines: lines.length
    });

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
        } else if (obj.url) {
          // Image (using 'url' instead of deprecated 'originalSrc')
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

    console.log('📦 JSONL parsing complete:', {
      products_found: products.length,
      total_variants: products.reduce((sum: number, p: any) => sum + (p.variants?.length || 0), 0),
      total_images: products.reduce((sum: number, p: any) => sum + (p.images?.length || 0), 0),
      sample_product_ids: products.slice(0, 3).map((p: any) => p.id)
    });

    // Insert products into database
    const productRecords = [];

    for (const product of products) {
      // Fetch inventory for all variants
      const variantIds = product.variants?.map((v: any) => v.inventoryItem?.id).filter(Boolean) || [];
      
      let inventoryByLocation: any = {};

      if (variantIds.length > 0) {
        console.log(`📦 Fetching inventory for ${variantIds.length} variants of product:`, product.id);
        
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
          image_url: product.images?.[0]?.url,
          image_gallery: product.images?.map((img: any) => ({
            url: img.url,
            alt: img.altText,
          })),
          handle: product.handle,
          vendor: product.vendor,
          product_type: product.productType,
          tags: product.tags,
          status: product.status === 'ACTIVE' ? 'active' : 'draft',
          metadata: {
            barcode: variant.barcode,
            weight: variant.inventoryItem?.measurement?.weight?.value ?? null,
            weight_unit: variant.inventoryItem?.measurement?.weight?.unit ?? null,
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
    const totalBatches = Math.ceil(productRecords.length / batchSize);
    console.log(`💾 Starting database upsert: ${productRecords.length} records in ${totalBatches} batches`);
    
    for (let i = 0; i < productRecords.length; i += batchSize) {
      const batch = productRecords.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`📝 Upserting batch ${batchNumber}/${totalBatches}:`, {
        batch_size: batch.length,
        sample_skus: batch.slice(0, 3).map((p: any) => p.sku || 'no-sku')
      });
      
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
        sync_status: 'success',
        products_count: productRecords.length,
        sync_error: null,
        cancellation_requested_at: null,
      })
      .eq('id', catalogSourceId);

    const endTime = Date.now();
    const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('✅ Bulk import completed successfully:', {
      total_products: products.length,
      total_variants: productRecords.length,
      duration_seconds: durationSeconds,
      shop_domain,
      catalogSourceId
    });

    return new Response(
      JSON.stringify({
        success: true,
        productsImported: productRecords.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('❌ BULK IMPORT FAILED:', {
      error: errorMessage,
      stack: errorStack,
      catalogSourceId,
      workspaceId,
      timestamp: new Date().toISOString()
    });
    
    // Update catalog source with error status (using catalogSourceId from outer scope)
    if (catalogSourceId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );
        
        await supabaseClient
          .from('catalog_sources')
          .update({
            sync_status: 'failed',
            sync_error: errorMessage,
          })
          .eq('id', catalogSourceId);
      } catch (updateError) {
        console.error('Failed to update error status:', updateError);
      }
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
