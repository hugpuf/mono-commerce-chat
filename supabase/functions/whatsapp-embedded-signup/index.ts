import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { setup_data, workspace_id } = await req.json();

    console.log('📨 Embedded Signup callback received');
    console.log('   • workspace_id:', workspace_id);
    console.log('   • has_setup_data:', !!setup_data);

    if (!setup_data) {
      throw new Error('No setup_data provided');
    }

    if (!workspace_id) {
      throw new Error('No workspace_id provided');
    }

    // Extract WABA details from setup_data
    const phoneNumberId = setup_data.phone_number_id;
    const wabaId = setup_data.waba_id;
    const businessId = setup_data.business_id;
    const phoneNumber = setup_data.phone_number;

    console.log('📞 WABA Details:');
    console.log('   • phone_number_id:', phoneNumberId);
    console.log('   • waba_id:', wabaId);
    console.log('   • business_id:', businessId);
    console.log('   • phone_number:', phoneNumber);

    if (!phoneNumberId || !wabaId) {
      throw new Error('Missing required WABA details in setup_data');
    }

    // Get system user token for long-lived access
    const systemUserToken = Deno.env.get('META_SYSTEM_USER_TOKEN');
    if (!systemUserToken) {
      throw new Error('META_SYSTEM_USER_TOKEN not configured');
    }

    console.log('🔑 Using system user token to fetch WABA details');

    // Get WABA name and other details using system user token
    const wabaResponse = await fetch(
      `https://graph.facebook.com/v24.0/${wabaId}?fields=name,currency,timezone_id`,
      {
        headers: {
          'Authorization': `Bearer ${systemUserToken}`,
        },
      }
    );

    if (!wabaResponse.ok) {
      const errorText = await wabaResponse.text();
      console.error('❌ Failed to fetch WABA details:', errorText);
      throw new Error('Failed to fetch WABA details');
    }

    const wabaData = await wabaResponse.json();
    console.log('✅ WABA data fetched:', wabaData);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Store WhatsApp account
    const { data: accountData, error: insertError } = await supabase
      .from('whatsapp_accounts')
      .upsert({
        workspace_id: workspace_id,
        phone_number_id: phoneNumberId,
        waba_id: wabaId,
        business_id: businessId,
        phone_number: phoneNumber,
        display_name: wabaData.name || phoneNumber,
        status: 'active',
        access_token: systemUserToken, // Using system user token for long-lived access
      }, {
        onConflict: 'workspace_id',
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to store WhatsApp account:', insertError);
      throw new Error('Failed to store WhatsApp account');
    }

    console.log('✅ WhatsApp account stored:', accountData);

    // Subscribe webhooks
    console.log('📡 Subscribing to webhooks...');
    const webhookResponse = await fetch(
      `https://graph.facebook.com/v24.0/${wabaId}/subscribed_apps`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${systemUserToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('⚠️ Webhook subscription failed:', errorText);
      // Don't throw - webhook subscription is not critical
    } else {
      console.log('✅ Webhooks subscribed successfully');
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_workspace_id: workspace_id,
      p_action: 'whatsapp_connected',
      p_target_type: 'whatsapp_account',
      p_target_id: accountData.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        account: accountData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error in whatsapp-embedded-signup:', error);
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
