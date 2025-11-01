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

    console.log('Received WhatsApp OAuth callback', { 
      workspace_id, 
      has_code: !!code
    });

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

    // Step 2: Fetch WABA (WhatsApp Business Account) data from Graph API
    console.log('Fetching WABA data from Graph API...');
    
    const wabaResponse = await fetch(
      'https://graph.facebook.com/v24.0/me/businesses?fields=owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}',
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!wabaResponse.ok) {
      const errorData = await wabaResponse.json();
      console.error('Failed to fetch WABA data:', errorData);
      throw new Error(`Failed to fetch WhatsApp Business Account data: ${JSON.stringify(errorData)}`);
    }

    const wabaData = await wabaResponse.json();
    console.log('WABA response:', JSON.stringify(wabaData, null, 2));

    // Extract the first WABA and phone number
    const businesses = wabaData.data || [];
    if (businesses.length === 0) {
      throw new Error('No businesses found in your Meta account');
    }

    const wabas = businesses[0].owned_whatsapp_business_accounts?.data || [];
    if (wabas.length === 0) {
      throw new Error('No WhatsApp Business Accounts found');
    }

    const waba = wabas[0];
    const waba_id = waba.id;
    const phoneNumbers = waba.phone_numbers?.data || [];
    
    if (phoneNumbers.length === 0) {
      throw new Error('No phone numbers found for this WhatsApp Business Account');
    }

    const phoneNumber = phoneNumbers[0];
    const phone_number_id = phoneNumber.id;
    const displayPhoneNumber = phoneNumber.display_phone_number;
    const verifiedName = phoneNumber.verified_name;

    console.log('Extracted WABA data:', { waba_id, phone_number_id, displayPhoneNumber, verifiedName });

    // Step 3: Store the WhatsApp account in the database
    const { data, error } = await supabase
      .from('whatsapp_accounts')
      .upsert({
        workspace_id,
        waba_id: waba_id,
        phone_number_id: phone_number_id,
        phone_number: displayPhoneNumber,
        display_name: verifiedName,
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

    // Step 4: Subscribe webhooks at WABA level (no body needed)
    try {
      const webhookResponse = await fetch(
        `https://graph.facebook.com/v24.0/${waba_id}/subscribed_apps`,
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