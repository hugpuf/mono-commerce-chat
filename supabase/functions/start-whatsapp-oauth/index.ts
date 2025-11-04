import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(null, { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const metaAppId = Deno.env.get('META_APP_ID');
    const metaConfigId = Deno.env.get('META_CONFIG_ID');
    const redirectUriEnv = Deno.env.get('WHATSAPP_REDIRECT_URI');

    if (!supabaseUrl || !supabaseKey || !metaAppId || !metaConfigId) {
      console.error('Missing environment configuration for WhatsApp OAuth start');
      return new Response(
        JSON.stringify({
          error: 'Meta configuration incomplete. Please contact support.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const redirectUri = (redirectUriEnv || '')
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)[0] ?? 'managed-in-meta-dashboard';

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { workspace_id }: { workspace_id?: string } = await req.json();

    if (!workspace_id) {
      console.error('Workspace ID missing when starting WhatsApp OAuth');
      return new Response(
        JSON.stringify({ error: 'Workspace ID required to start WhatsApp OAuth.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stateId = crypto.randomUUID();

    const { error: insertError } = await supabase
      .from('oauth_states')
      .insert({
        state: stateId,
        redirect_uri: redirectUri,
        app_id: metaAppId,
        workspace_id
      });

    if (insertError) {
      console.error('Failed to insert OAuth state from start function:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to initialize WhatsApp OAuth. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ OAuth state created by start-whatsapp-oauth:', { workspace_id, state: stateId });

    return new Response(
      JSON.stringify({
        state: stateId,
        appId: metaAppId,
        configId: metaConfigId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in start-whatsapp-oauth:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
