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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      code, 
      workspace_id,
      state,
      redirect_uri
    } = await req.json();

    console.log('Received WhatsApp OAuth callback', { workspace_id, has_code: !!code });

    // Step 1: Exchange code for access token (server-side only)
    const metaAppId = Deno.env.get('META_APP_ID')!;
    const metaAppSecret = Deno.env.get('META_APP_SECRET')!;

    const tokenResponse = await fetch(
      'https://graph.facebook.com/v24.0/oauth/access_token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: metaAppId,
          client_secret: metaAppSecret,
          redirect_uri: redirect_uri,
          code: code
        })
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      throw new Error(`Failed to exchange code for token: ${JSON.stringify(errorData)}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log('Successfully exchanged code for access token');

    // Step 2: Debug token to get WABA ID and confirm scopes (optional but helpful)
    const debugResponse = await fetch(
      `https://graph.facebook.com/v24.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`
    );

    if (!debugResponse.ok) {
      console.warn('Debug token failed, continuing without scope verification');
    } else {
      const debugData = await debugResponse.json();
      console.log('Token scopes:', debugData.data?.scopes);
    }

    // Step 3: Get business accounts to find WABA ID
    const businessResponse = await fetch(
      `https://graph.facebook.com/v24.0/me/businesses?fields=owned_whatsapp_business_accounts{id}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!businessResponse.ok) {
      throw new Error('Failed to fetch business accounts');
    }

    const businessData = await businessResponse.json();
    const wabaId = businessData.data?.[0]?.owned_whatsapp_business_accounts?.data?.[0]?.id;

    if (!wabaId) {
      throw new Error('No WhatsApp Business Account found');
    }

    console.log('Found WABA ID:', wabaId);

    // Step 4: Get phone numbers under this WABA
    const phonesResponse = await fetch(
      `https://graph.facebook.com/v24.0/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!phonesResponse.ok) {
      throw new Error('Failed to fetch phone numbers');
    }

    const phonesData = await phonesResponse.json();
    const phoneNumber = phonesData.data?.[0];

    if (!phoneNumber) {
      throw new Error('No phone number found for WABA');
    }

    console.log('Found phone number:', phoneNumber.display_phone_number);

    // Step 5: Store the WhatsApp account in the database
    const { data, error } = await supabase
      .from('whatsapp_accounts')
      .upsert({
        workspace_id,
        waba_id: wabaId,
        phone_number_id: phoneNumber.id,
        phone_number: phoneNumber.display_phone_number,
        display_name: phoneNumber.verified_name,
        access_token: accessToken,
        webhook_verify_token: crypto.randomUUID(),
        status: 'active'
      }, {
        onConflict: 'phone_number_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing WhatsApp account:', error);
      throw error;
    }

    console.log('WhatsApp account stored successfully', data);

    // Step 6: Subscribe webhooks at WABA level (no body needed)
    try {
      const webhookResponse = await fetch(
        `https://graph.facebook.com/v24.0/${wabaId}/subscribed_apps`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (webhookResponse.ok) {
        console.log('Webhook subscribed successfully');
        
        // Update webhook status
        await supabase
          .from('whatsapp_accounts')
          .update({ webhook_status: 'active' })
          .eq('id', data.id);
      } else {
        const errorData = await webhookResponse.json();
        console.error('Failed to subscribe webhook:', errorData);
      }
    } catch (webhookError) {
      console.error('Error subscribing webhook:', webhookError);
      // Don't fail the whole request if webhook subscription fails
    }

    return new Response(
      JSON.stringify({ success: true, account: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in whatsapp-oauth-callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});