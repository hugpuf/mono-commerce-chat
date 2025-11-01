import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { workspaceId, wabaId } = await req.json();

    if (!workspaceId || !wabaId) {
      throw new Error('Missing required parameters: workspaceId and wabaId');
    }

    // Fetch workspace data
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (workspaceError) throw workspaceError;

    // Fetch WhatsApp account
    const { data: whatsappAccount, error: waError } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('waba_id', wabaId)
      .single();

    if (waError) throw waError;

    if (!whatsappAccount.access_token) {
      throw new Error('WhatsApp access token not found');
    }

    // Prepare Meta API payload
    const metaPayload: any = {};

    if (workspace.business_description) {
      metaPayload.about = workspace.business_description;
    }

    if (workspace.business_address) {
      metaPayload.address = workspace.business_address;
    }

    if (workspace.business_email) {
      metaPayload.email = workspace.business_email;
    }

    if (workspace.business_website) {
      metaPayload.websites = [workspace.business_website];
    }

    if (workspace.business_category) {
      metaPayload.vertical = workspace.business_category;
    }

    // Only make API call if there's data to update
    if (Object.keys(metaPayload).length > 0) {
      const metaApiUrl = `https://graph.facebook.com/v21.0/${whatsappAccount.phone_number_id}`;
      
      const response = await fetch(metaApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappAccount.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metaPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Meta API error:', errorData);
        throw new Error(`Failed to sync to WhatsApp: ${JSON.stringify(errorData)}`);
      }

      console.log('Successfully synced to WhatsApp', { wabaId, metaPayload });
    }

    // Update local WhatsApp account with synced data
    const { error: updateError } = await supabase
      .from('whatsapp_accounts')
      .update({
        about_text: workspace.business_description,
        address: workspace.business_address,
        email: workspace.business_email,
        website: workspace.business_website,
        category: workspace.business_category,
        business_name: workspace.company_name,
        logo_url: workspace.logo_url,
        updated_at: new Date().toISOString(),
      })
      .eq('waba_id', wabaId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, message: 'Synced to WhatsApp successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-to-whatsapp:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
