import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CancelSyncRequest {
  catalogSourceId: string;
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

    const { catalogSourceId }: CancelSyncRequest = await req.json();

    console.log('Cancelling sync for catalog source:', catalogSourceId);

    // Mark the sync as cancelled
    const { error } = await supabaseClient
      .from('catalog_sources')
      .update({
        sync_status: 'cancelled',
        cancellation_requested_at: new Date().toISOString(),
      })
      .eq('id', catalogSourceId);

    if (error) {
      throw error;
    }

    console.log('Sync cancellation requested successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Sync cancelled' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cancel sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
