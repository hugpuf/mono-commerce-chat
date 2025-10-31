import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OAuthCallbackRequest {
  code: string;
  shop: string;
  workspaceId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { code, shop, workspaceId }: OAuthCallbackRequest = await req.json();

    if (!code || !shop || !workspaceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Exchange code for access token
    const clientId = Deno.env.get('SHOPIFY_CLIENT_ID');
    const clientSecret = Deno.env.get('SHOPIFY_CLIENT_SECRET');

    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange OAuth code for access token');
    }

    const { access_token, scope } = await tokenResponse.json();
    const scopes = scope.split(',');

    // Store connection in catalog_sources
    const { data: catalogSource, error: catalogError } = await supabaseClient
      .from('catalog_sources')
      .upsert({
        workspace_id: workspaceId,
        provider: 'shopify',
        shop_domain: shop,
        access_token: access_token,
        api_version: '2024-10',
        scopes: scopes,
        status: 'active',
        provider_config: {
          installation_date: new Date().toISOString(),
        },
      }, {
        onConflict: 'workspace_id,provider',
      })
      .select()
      .single();

    if (catalogError) {
      console.error('Database error:', catalogError);
      throw new Error('Failed to store catalog source');
    }

    // Fetch and store Shopify locations
    const locationsResponse = await fetch(
      `https://${shop}/admin/api/2024-10/locations.json`,
      {
        headers: {
          'X-Shopify-Access-Token': access_token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (locationsResponse.ok) {
      const { locations } = await locationsResponse.json();
      
      const locationRecords = locations.map((loc: any) => ({
        catalog_source_id: catalogSource.id,
        workspace_id: workspaceId,
        shopify_location_id: loc.id.toString(),
        name: loc.name,
        address: {
          address1: loc.address1,
          address2: loc.address2,
          city: loc.city,
          province: loc.province,
          country: loc.country_code,
          zip: loc.zip,
        },
        is_active: loc.active,
      }));

      await supabaseClient
        .from('shopify_locations')
        .upsert(locationRecords, {
          onConflict: 'catalog_source_id,shopify_location_id',
        });
    }

    // Trigger bulk import (fire and forget)
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/shopify-bulk-import`, {
      method: 'POST',
      headers: {
        'Authorization': req.headers.get('Authorization')!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        catalogSourceId: catalogSource.id,
        workspaceId,
      }),
    }).catch(err => console.error('Failed to trigger bulk import:', err));

    return new Response(
      JSON.stringify({
        success: true,
        catalogSourceId: catalogSource.id,
        shop,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Shopify OAuth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
