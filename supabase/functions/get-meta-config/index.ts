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
    const redirectUriEnv = Deno.env.get('WHATSAPP_REDIRECT_URI');

    if (!metaAppId || !metaConfigId || !redirectUriEnv) {
      console.error('Meta App configuration incomplete');
      return new Response(
        JSON.stringify({
          error: 'Meta App credentials not configured. Please add META_APP_ID, META_CONFIG_ID and WHATSAPP_REDIRECT_URI secrets.'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const redirectUris = redirectUriEnv
      .split(',')
      .map((uri) => uri.trim())
      .filter((uri) => uri.length > 0);

    if (redirectUris.length === 0) {
      console.error('WHATSAPP_REDIRECT_URI secret is empty');
      return new Response(
        JSON.stringify({
          error: 'WHATSAPP_REDIRECT_URI secret is empty. Please configure a redirect URI.'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (redirectUris.length > 1) {
      console.warn('Multiple redirect URIs provided. Using the first value for embedded signup.', redirectUris);
    }

    const redirectUri = redirectUris[0];

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
