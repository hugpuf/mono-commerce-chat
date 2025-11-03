import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const metaAppId = Deno.env.get('META_APP_ID');
    const metaConfigId = Deno.env.get('META_CONFIG_ID');
    const redirectUri = Deno.env.get('WHATSAPP_REDIRECT_URI');

    if (!metaAppId || !metaConfigId) {
      console.error('Meta App credentials not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Meta App credentials not configured. Please add META_APP_ID and META_CONFIG_ID secrets.' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!redirectUri) {
      console.error('WHATSAPP_REDIRECT_URI not configured');
      return new Response(
        JSON.stringify({ 
          error: 'WHATSAPP_REDIRECT_URI environment variable not configured' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Backend is single source of truth for redirect_uri
    return new Response(
      JSON.stringify({ 
        appId: metaAppId,
        configId: metaConfigId,
        redirectUri: redirectUri
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-meta-config function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
