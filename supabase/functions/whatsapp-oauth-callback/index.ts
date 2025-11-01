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
      redirect_uri,
      waba_id,
      phone_number_id
    } = await req.json();

    console.log('Received WhatsApp OAuth callback', { 
      workspace_id, 
      has_code: !!code,
      has_waba_id: !!waba_id,
      has_phone_number_id: !!phone_number_id
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

    // Step 2: Validate we have the WABA data (provided by Embedded Signup postMessage)
    if (!waba_id || !phone_number_id) {
      throw new Error('Missing WABA ID or phone number ID from Embedded Signup');
    }

    console.log('Using WABA data from Embedded Signup:', { waba_id, phone_number_id });

    // Step 3: Optionally fetch phone number details for display
    let displayPhoneNumber = null;
    let verifiedName = null;
    
    try {
      const phoneDetailsResponse = await fetch(
        `https://graph.facebook.com/v24.0/${phone_number_id}?fields=display_phone_number,verified_name`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (phoneDetailsResponse.ok) {
        const phoneDetails = await phoneDetailsResponse.json();
        displayPhoneNumber = phoneDetails.display_phone_number;
        verifiedName = phoneDetails.verified_name;
        console.log('Fetched phone details:', { displayPhoneNumber, verifiedName });
      } else {
        console.warn('Could not fetch phone details, will use defaults');
      }
    } catch (e) {
      console.warn('Error fetching phone details:', e);
    }

    // Step 4: Store the WhatsApp account in the database
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

    // Step 5: Subscribe webhooks at WABA level (no body needed)
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