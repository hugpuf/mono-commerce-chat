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

  console.log('📥 Received WhatsApp OAuth callback', {
    workspace_id,
    has_code: !!code,
    code_length: code?.length,
    redirect_uri,
    has_setup_data: !!setup_data,
    setup_data_details: setup_data ? {
      has_waba_id: !!setup_data.waba_id,
      has_phone_number_id: !!setup_data.phone_number_id,
      has_business_id: !!setup_data.business_id,
      waba_id: setup_data.waba_id,
      phone_number_id: setup_data.phone_number_id
    } : null,
    timestamp: new Date().toISOString()
  });
    
    // Log setup data for debugging
    if (setup_data) {
      console.log('📦 Embedded Signup setup data received:', JSON.stringify(setup_data, null, 2));
    }

    // IDEMPOTENCY: Reserve the OAuth code (first request wins)
    console.log('🔍 Checking if code has been used (idempotency check)...');
    const { error: reserveError } = await supabase
      .from('oauth_code_uses')
      .insert({ 
        code, 
        workspace_id,
        provider: 'whatsapp'
      });

    if (reserveError) {
      console.error('❌ OAuth code already used (duplicate request):', {
        errorCode: reserveError.code,
        errorMessage: reserveError.message,
        errorDetails: reserveError.details,
        hint: reserveError.hint
      });
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

    console.log('✅ Code reserved successfully, proceeding with token exchange...');

    // Step 1: Exchange code for access token (server-side only)
    console.log('🔄 Step 1: Exchanging code for access token...');
    const metaAppId = Deno.env.get('META_APP_ID')!;
    const metaAppSecret = Deno.env.get('META_APP_SECRET')!;

    console.log('📤 Making token exchange request to Meta Graph API', {
      endpoint: 'https://graph.facebook.com/v24.0/oauth/access_token',
      hasAppId: !!metaAppId,
      hasAppSecret: !!metaAppSecret,
      redirectUri: redirect_uri
    });

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

    console.log('📥 Token exchange response received:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      ok: tokenResponse.ok
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('❌ Token exchange failed:', {
        status: tokenResponse.status,
        error: errorData.error,
        errorType: errorData.error?.type,
        errorCode: errorData.error?.code,
        errorSubcode: errorData.error?.error_subcode,
        errorMessage: errorData.error?.message,
        fbtraceId: errorData.error?.fbtrace_id
      });
      
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

  console.log('✅ Successfully exchanged code for access token', {
    hasAccessToken: !!accessToken,
    tokenLength: accessToken?.length,
    tokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : null
  });

    // Step 2: Extract WABA data (prefer setup_data from Embedded Signup, fallback to API)
    console.log('🔍 Step 2: Determining data source for WABA information...');
    let waba_id: string;
    let phone_number_id: string;
    let displayPhoneNumber: string;
    let verifiedName: string;

    if (setup_data && setup_data.whatsapp_business_account) {
      // Use data from Embedded Signup (recommended approach)
      console.log('✅ Using WABA data from Embedded Signup setup response (preferred method)');
      
      const wabaData = setup_data.whatsapp_business_account;
      waba_id = wabaData.id;
      
      console.log('📦 Embedded setup data structure:', {
        hasWabaId: !!waba_id,
        hasPhoneNumbers: !!wabaData.phone_numbers,
        phoneNumbersCount: wabaData.phone_numbers?.length
      });
      
      if (!wabaData.phone_numbers || wabaData.phone_numbers.length === 0) {
        console.error('❌ No phone numbers in embedded setup data');
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
      
      console.log('✅ Successfully extracted WABA data from embedded setup:', { 
        waba_id, 
        phone_number_id, 
        displayPhoneNumber, 
        verifiedName 
      });
    } else {
      // Fallback: Fetch WABA data via Graph API (requires more permissions)
      console.warn('⚠️ No setup data from embedded signup, falling back to Graph API', {
        hasSetupData: !!setup_data,
        hasWabaInSetup: !!(setup_data?.whatsapp_business_account),
        note: 'This fallback requires business_management permission and may fail'
      });
      
      // Step 2A: Fetch user's businesses
      console.log('📞 Step 2A: Fetching businesses for user via Graph API...');
      const businessesResponse = await fetch(
        'https://graph.facebook.com/v24.0/me/businesses?fields=id,name',
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      console.log('📥 Businesses API response:', {
        status: businessesResponse.status,
        statusText: businessesResponse.statusText,
        ok: businessesResponse.ok
      });

      if (!businessesResponse.ok) {
        const errorData = await businessesResponse.json();
        console.error('❌ Failed to fetch businesses from Graph API:', {
          status: businessesResponse.status,
          error: errorData.error,
          errorType: errorData.error?.type,
          errorCode: errorData.error?.code,
          errorMessage: errorData.error?.message,
          fbtraceId: errorData.error?.fbtrace_id,
          fullError: JSON.stringify(errorData, null, 2)
        });
        
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
      console.log('📦 Businesses data received:', {
        hasData: !!businessesData.data,
        businessCount: businessesData.data?.length,
        fullResponse: JSON.stringify(businessesData, null, 2)
      });

      const businesses = businessesData.data || [];
      if (businesses.length === 0) {
        console.error('❌ No businesses found for user');
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
      console.log('✅ Found business to use:', {
        businessId,
        businessName: businesses[0].name,
        totalBusinesses: businesses.length
      });

      // Step 2B: Fetch WABA data for that business
      console.log('📞 Step 2B: Fetching WABA data for business...');
      const wabaResponse = await fetch(
        `https://graph.facebook.com/v24.0/${businessId}?fields=owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      console.log('📥 WABA API response:', {
        status: wabaResponse.status,
        statusText: wabaResponse.statusText,
        ok: wabaResponse.ok
      });

      if (!wabaResponse.ok) {
        const errorData = await wabaResponse.json();
        console.error('❌ Failed to fetch WABA data from Graph API:', {
          status: wabaResponse.status,
          error: errorData.error,
          errorType: errorData.error?.type,
          errorCode: errorData.error?.code,
          errorMessage: errorData.error?.message,
          fbtraceId: errorData.error?.fbtrace_id
        });
        
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
      console.log('📦 WABA data received:', {
        hasOwnedWabas: !!wabaData.owned_whatsapp_business_accounts,
        wabaCount: wabaData.owned_whatsapp_business_accounts?.data?.length,
        fullResponse: JSON.stringify(wabaData, null, 2)
      });

      // Extract WABAs from the business object
      const wabas = wabaData.owned_whatsapp_business_accounts?.data || [];
      if (wabas.length === 0) {
        console.error('❌ No WABAs found for business');
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
      
      console.log('📦 WABA details:', {
        wabaId: waba_id,
        wabaName: waba.name,
        phoneNumberCount: phoneNumbers.length
      });
      
      if (phoneNumbers.length === 0) {
        console.error('❌ No phone numbers found for WABA');
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

      console.log('✅ Successfully extracted WABA data from API fallback:', { 
        businessId, 
        waba_id, 
        phone_number_id, 
        displayPhoneNumber, 
        verifiedName 
      });
    }

    // Step 3: Store the WhatsApp account in the database
    console.log('💾 Step 3: Storing WhatsApp account in database...');
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
      console.error('❌ Error storing WhatsApp account in database:', {
        error,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint
      });
      throw error;
    }

    console.log('✅ WhatsApp account stored successfully:', {
      accountId: data.id,
      workspaceId: data.workspace_id,
      phoneNumber: data.phone_number,
      displayName: data.display_name
    });

    // Step 4: Subscribe webhooks at WABA level (no body needed)
    console.log('🔔 Step 4: Subscribing webhooks...');
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

      console.log('📥 Webhook subscription response:', {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        ok: webhookResponse.ok
      });

      if (webhookResponse.ok) {
        console.log('✅ Webhook subscribed successfully');
        
        // Update webhook status
        await supabase
          .from('whatsapp_accounts')
          .update({ webhook_status: 'active' })
          .eq('id', data.id);
        
        console.log('✅ Webhook status updated in database');
      } else {
        const errorData = await webhookResponse.json();
        console.error('⚠️ Failed to subscribe webhook (non-critical):', {
          status: webhookResponse.status,
          errorData: JSON.stringify(errorData, null, 2)
        });
      }
    } catch (webhookError) {
      console.error('⚠️ Error subscribing webhook (non-critical):', webhookError);
      // Don't fail the whole request if webhook subscription fails
    }

    console.log('✅ WhatsApp OAuth callback completed successfully');
    return new Response(
      JSON.stringify({ success: true, account: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ CRITICAL ERROR in whatsapp-oauth-callback:', {
      error,
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      fullError: JSON.stringify(error, null, 2)
    });
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