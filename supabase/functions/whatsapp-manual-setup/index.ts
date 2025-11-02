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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const systemUserToken = Deno.env.get('META_SYSTEM_USER_TOKEN')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { workspace_id, waba_id, phone_number_id, display_phone_number, business_name } = await req.json();

    console.log('📱 Setting up WhatsApp manually:', { workspace_id, waba_id, phone_number_id });

    if (!workspace_id || !waba_id || !phone_number_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the WABA exists and get details using system user token
    const wabaResponse = await fetch(
      `https://graph.facebook.com/v24.0/${waba_id}?access_token=${systemUserToken}`,
      { method: 'GET' }
    );

    if (!wabaResponse.ok) {
      const error = await wabaResponse.json();
      console.error('❌ WABA verification failed:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid WABA ID or insufficient permissions' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const wabaData = await wabaResponse.json();
    console.log('✅ WABA verified:', wabaData);

    // Fetch phone number details
    const phoneResponse = await fetch(
      `https://graph.facebook.com/v24.0/${phone_number_id}?access_token=${systemUserToken}`,
      { method: 'GET' }
    );

    let phoneData: any = {};
    if (phoneResponse.ok) {
      phoneData = await phoneResponse.json();
      console.log('📞 Phone number details:', phoneData);
    }

    // Generate a webhook verify token
    const webhookVerifyToken = crypto.randomUUID();

    // Store WhatsApp account details
    const { data: accountData, error: dbError } = await supabase
      .from('whatsapp_accounts')
      .upsert({
        workspace_id,
        waba_id,
        phone_number_id,
        phone_number: display_phone_number || phoneData.display_phone_number || '',
        display_name: business_name || wabaData.name || '',
        business_name: business_name || wabaData.name || '',
        webhook_verify_token: webhookVerifyToken,
        status: 'active',
        webhook_status: 'pending',
      }, {
        onConflict: 'workspace_id',
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to store WhatsApp account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ WhatsApp account stored:', accountData);

    // Subscribe to webhooks
    const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;
    console.log('🔔 Subscribing webhooks to:', webhookUrl);

    try {
      const webhookResponse = await fetch(
        `https://graph.facebook.com/v24.0/${waba_id}/subscribed_apps`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: systemUserToken,
          }),
        }
      );

      if (webhookResponse.ok) {
        const webhookResult = await webhookResponse.json();
        console.log('✅ Webhook subscribed:', webhookResult);

        await supabase
          .from('whatsapp_accounts')
          .update({ webhook_status: 'active' })
          .eq('id', accountData.id);
      } else {
        const webhookError = await webhookResponse.json();
        console.error('⚠️ Webhook subscription failed:', webhookError);
      }
    } catch (webhookError) {
      console.error('⚠️ Webhook subscription error:', webhookError);
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_workspace_id: workspace_id,
      p_action: 'whatsapp_account_connected',
      p_target_type: 'whatsapp_account',
      p_target_id: accountData.id,
      p_after_state: { waba_id, phone_number_id },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        account: accountData,
        message: 'WhatsApp account connected successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in whatsapp-manual-setup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
