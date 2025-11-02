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
      setup_data
    } = await req.json();

    console.log('Received WhatsApp OAuth callback', { 
      workspace_id, 
      has_code: !!code,
      redirect_uri,
      has_setup_data: !!setup_data
    });
    
    // Log setup data for debugging
    if (setup_data) {
      console.log('📦 Embedded Signup setup data received:', JSON.stringify(setup_data, null, 2));
    }

    // IDEMPOTENCY: Reserve the OAuth code (first request wins)
    console.log('Checking if code has been used...');
    const { error: reserveError } = await supabase
      .from('oauth_code_uses')
      .insert({ 
        code, 
        workspace_id,
        provider: 'whatsapp'
      });

    if (reserveError) {
      console.error('OAuth code already used (duplicate request):', reserveError);
      return new Response(
        JSON.stringify({ 
          error: 'This authorization code has already been used. Please start the WhatsApp connection process again from the beginning.',
          code: 'CODE_ALREADY_USED'
        }),
        { 
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Code reserved successfully, proceeding with token exchange...');

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
      
      // Check for "authorization code has been used" error
      if (errorData.error?.error_subcode === 36009) {
        return new Response(
          JSON.stringify({ error: 'Authorization code already used. Please try connecting again.' }),
          { 
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      throw new Error(`Failed to exchange code for token: ${JSON.stringify(errorData)}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log('Successfully exchanged code for access token');

    // Step 2: Extract WABA data (prefer setup_data from Embedded Signup, fallback to API)
    let waba_id: string;
    let phone_number_id: string;
    let displayPhoneNumber: string;
    let verifiedName: string;

    if (setup_data && setup_data.whatsapp_business_account) {
      // Use data from Embedded Signup (recommended approach)
      console.log('✅ Using WABA data from Embedded Signup setup response');
      
      const wabaData = setup_data.whatsapp_business_account;
      waba_id = wabaData.id;
      
      if (!wabaData.phone_numbers || wabaData.phone_numbers.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'No phone numbers found in the Embedded Signup response. Please complete the phone number provisioning step.' 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      const phoneNumber = wabaData.phone_numbers[0];
      phone_number_id = phoneNumber.id;
      displayPhoneNumber = phoneNumber.display_phone_number;
      verifiedName = phoneNumber.verified_name || displayPhoneNumber;
      
      console.log('Extracted WABA data from setup:', { 
        waba_id, 
        phone_number_id, 
        displayPhoneNumber, 
        verifiedName 
      });
    } else {
      // Fallback: Fetch WABA data via Graph API (requires more permissions)
      console.log('⚠️ No setup data provided, falling back to Graph API (requires business_management permission)');
      
      // Step 2A: Fetch user's businesses
      console.log('Step 2A: Fetching businesses for user...');
      const businessesResponse = await fetch(
        'https://graph.facebook.com/v24.0/me/businesses?fields=id,name',
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (!businessesResponse.ok) {
        const errorData = await businessesResponse.json();
        console.error('Failed to fetch businesses:', errorData);
        
        // Check for missing permission
        if (errorData.error?.code === 100) {
          return new Response(
            JSON.stringify({ 
              error: 'Missing business_management permission. The Embedded Signup flow should provide WABA data directly. Please try the connection process again.',
              details: 'If this error persists, ensure the Meta App has business_management permission and the user completed all signup steps.'
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        throw new Error(`Failed to fetch businesses: ${JSON.stringify(errorData)}`);
      }

      const businessesData = await businessesResponse.json();
      console.log('Businesses response:', JSON.stringify(businessesData, null, 2));

      const businesses = businessesData.data || [];
      if (businesses.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'No Meta Business accounts found. Please ensure you have a Meta Business account and have completed the embedded signup flow.',
            details: 'The app must be associated with a Business in Meta Business Manager.'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const businessId = businesses[0].id;
      console.log('Using business:', businessId);

      // Step 2B: Fetch WABA data for that business
      console.log('Step 2B: Fetching WABA data for business...');
      const wabaResponse = await fetch(
        `https://graph.facebook.com/v24.0/${businessId}?fields=owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (!wabaResponse.ok) {
        const errorData = await wabaResponse.json();
        console.error('Failed to fetch WABA data:', errorData);
        
        if (errorData.error?.code === 100) {
          return new Response(
            JSON.stringify({ 
              error: 'Missing whatsapp_business_management permission. Ensure the embedded signup completed and the app has WhatsApp Business permissions.',
              details: 'The access token must include whatsapp_business_management scope.'
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        throw new Error(`Failed to fetch WABA data: ${JSON.stringify(errorData)}`);
      }

      const wabaData = await wabaResponse.json();
      console.log('WABA response:', JSON.stringify(wabaData, null, 2));

      // Extract WABAs from the business object
      const wabas = wabaData.owned_whatsapp_business_accounts?.data || [];
      if (wabas.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'No WhatsApp Business Accounts found for this business. Please complete the embedded signup flow and ensure at least one WABA is provisioned.',
            details: 'The embedded signup should automatically create a WABA. Try the signup flow again.'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const waba = wabas[0];
      waba_id = waba.id;
      const phoneNumbers = waba.phone_numbers?.data || [];
      
      if (phoneNumbers.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'No phone numbers found for this WhatsApp Business Account. Please complete the phone number provisioning step in the embedded signup.' 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const phoneNumber = phoneNumbers[0];
      phone_number_id = phoneNumber.id;
      displayPhoneNumber = phoneNumber.display_phone_number;
      verifiedName = phoneNumber.verified_name;

      console.log('Extracted WABA data from API:', { 
        businessId, 
        waba_id, 
        phone_number_id, 
        displayPhoneNumber, 
        verifiedName 
      });
    }

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