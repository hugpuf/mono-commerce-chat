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
      redirect_uri: clientRedirectUri,
      setup_data
    } = await req.json();

    if (!state) {
      return new Response(
        JSON.stringify({ error: 'missing_state: OAuth state not provided. Please restart the connection from the app.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📨 Received WhatsApp OAuth callback', { 
      workspace_id, 
      has_code: !!code,
      has_state: !!state,
      client_redirect_uri: clientRedirectUri,
      has_setup_data: !!setup_data && Object.keys(setup_data).length > 0
    });
    
    // CRITICAL: Fetch the EXACT redirect_uri, app_id, and workspace_id from database
    console.log('🔍 Looking up OAuth state in database...');
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_states')
      .select('redirect_uri, app_id, workspace_id')
      .eq('state', state)
      .maybeSingle();
    
    if (stateError) {
      console.error('❌ Failed to fetch oauth_state:', stateError);
      return new Response(
        JSON.stringify({ error: 'state_lookup_failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!stateData) {
      console.error('❌ No oauth_state record found for provided state');
      return new Response(
        JSON.stringify({ error: 'missing_state: OAuth launch data not found. Please restart the connection.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const redirect_uri = stateData.redirect_uri;
    const app_id = stateData.app_id || Deno.env.get('META_APP_ID')!;
    const effectiveWorkspaceId = stateData.workspace_id || workspace_id;
    
    console.log('✅ Retrieved from database:', { redirect_uri, app_id, workspace_id: effectiveWorkspaceId });

    // Diagnostic logging for redirect_uri matching (critical for 36008 error prevention)
    console.log('🔍 Token exchange will use redirect_uri:', redirect_uri);
    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(redirect_uri)
    );
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    console.log('🔍 SHA256 hash of redirect_uri:', hashHex);
    
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
        workspace_id: effectiveWorkspaceId,
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
    const metaAppSecret = Deno.env.get('META_APP_SECRET')?.trim();

    if (!metaAppSecret) {
      console.error('❌ META_APP_SECRET is not configured');
      throw new Error('META_APP_SECRET environment variable is not set');
    }

    // Log secret length for debugging (without exposing actual value)
    console.log('🔐 Secret loaded, length:', metaAppSecret.length);

    console.log('🔄 Exchanging code for access token...');
    console.log('🔑 Using app_id:', app_id);
    console.log('🔗 Using redirect_uri:', redirect_uri);
    
    // Enhanced debugging - byte-by-byte URI comparison
    console.log('🔍 REDIRECT_URI DEBUG:');
    console.log('   Length:', redirect_uri.length);
    console.log('   First 10 chars:', redirect_uri.substring(0, 10));
    console.log('   Last 10 chars:', redirect_uri.substring(redirect_uri.length - 10));
    console.log('   Has trailing slash?', redirect_uri.endsWith('/'));
    console.log('   Has query params?', redirect_uri.includes('?'));
    
    // Prefer client-provided redirect_uri if available to ensure byte-for-byte match
    const effectiveRedirectUri = (typeof clientRedirectUri === 'string' && clientRedirectUri.length > 0)
      ? clientRedirectUri
      : redirect_uri;
    
    if (clientRedirectUri && clientRedirectUri !== redirect_uri) {
      console.log('⚠️ redirect_uri mismatch detected between client and DB. Using client-provided value for token exchange.', {
        db_redirect_uri: redirect_uri,
        client_redirect_uri: clientRedirectUri
      });
    }
    
    // Build token exchange params - URLSearchParams will handle encoding consistently
    const tokenParams = new URLSearchParams({
      client_id: app_id,
      client_secret: metaAppSecret,
      redirect_uri: effectiveRedirectUri,  // Use the exact client-provided value when available
      code: code
    });
    
    console.log('🔍 OAUTH DEBUG DETAILS -----------------------------------');
    console.log('Redirect URI from DB:', redirect_uri);
    console.log('Redirect URI from callback query:', clientRedirectUri);
    console.log('Final redirect_uri used in POST:', effectiveRedirectUri);
    
    // Calculate SHA256 hash
    const uriEncoder = new TextEncoder();
    const uriData = uriEncoder.encode(effectiveRedirectUri);
    const uriHashBuffer = await crypto.subtle.digest('SHA-256', uriData);
    const uriHashArray = Array.from(new Uint8Array(uriHashBuffer));
    const uriHashHex = uriHashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    console.log('SHA256 (used in token exchange):', uriHashHex);
    console.log('Encoded version:', encodeURIComponent(effectiveRedirectUri));
    console.log('-----------------------------------------------------------');
    
    console.log('📤 TOKEN EXCHANGE BODY:', Object.fromEntries(tokenParams.entries()));
    
    const tokenUrl = 'https://graph.facebook.com/v24.0/oauth/access_token';
    console.log('🌐 Token URL:', tokenUrl);
    
    // Use POST with body params (not GET with query params)
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams
    });

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

    // Step 2: Extract WABA data (STRICTLY from Embedded Signup setup_data)
    console.log('📊 Token type: user-scoped OAuth token (short-lived)');
    console.log('🔍 Checking for setup_data from Embedded Signup...');
    
    let waba_id: string;
    let phone_number_id: string;
    let displayPhoneNumber: string;
    let verifiedName: string;
    let business_id: string | undefined;

    // Try multiple shapes of setup_data
    if (setup_data) {
      console.log('✅ Setup data received, extracting WABA information...');
      
      // Shape 1: Standard Embedded Signup format
      if (setup_data.whatsapp_business_account) {
        const wabaData = setup_data.whatsapp_business_account;
        waba_id = wabaData.id || wabaData.whatsapp_business_account_id;
        business_id = setup_data.business_id;
        
        const phoneNumbers = wabaData.phone_numbers || [];
        if (phoneNumbers.length === 0) {
          return new Response(
            JSON.stringify({ 
              error: 'Embedded Signup incomplete: No phone number found. Please complete the phone number provisioning step in Meta\'s signup flow.' 
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
        verifiedName = phoneNumber.verified_name || displayPhoneNumber;
        
        console.log('✅ Using WABA data from Embedded Signup (standard format):', { 
          waba_id, 
          phone_number_id, 
          displayPhoneNumber, 
          verifiedName,
          business_id 
        });
      }
      // Shape 2: Alternate format with direct IDs
      else if (setup_data.waba_id || setup_data.whatsapp_business_account_id) {
        waba_id = setup_data.waba_id || setup_data.whatsapp_business_account_id;
        business_id = setup_data.business_id;
        
        // Check for phone number in different locations
        if (setup_data.phone_numbers && setup_data.phone_numbers.length > 0) {
          const phoneNumber = setup_data.phone_numbers[0];
          phone_number_id = phoneNumber.id || phoneNumber.phone_number_id;
          displayPhoneNumber = phoneNumber.display_phone_number;
          verifiedName = phoneNumber.verified_name || displayPhoneNumber;
        } else if (setup_data.phone_number_id) {
          phone_number_id = setup_data.phone_number_id;
          displayPhoneNumber = setup_data.display_phone_number || phone_number_id;
          verifiedName = setup_data.verified_name || displayPhoneNumber;
        } else {
          return new Response(
            JSON.stringify({ 
              error: 'Embedded Signup incomplete: No phone number ID found. Please complete the phone number provisioning step.' 
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        console.log('✅ Using WABA data from Embedded Signup (alternate format):', { 
          waba_id, 
          phone_number_id, 
          displayPhoneNumber, 
          verifiedName,
          business_id 
        });
      } else {
        // Setup data present but no usable WABA info
        console.error('❌ Setup data present but missing WABA information:', setup_data);
        return new Response(
          JSON.stringify({ 
            error: 'Invalid setup data: Missing WhatsApp Business Account information. Please restart the Embedded Signup flow and ensure you complete all steps including business and phone number selection.',
            details: 'The setup response did not contain the required WABA or phone number IDs.'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } else {
      // NO FALLBACK: Fail immediately if setup_data is missing
      console.error('❌ No setup_data provided - Embedded Signup flow did not complete properly');
      return new Response(
        JSON.stringify({ 
          error: 'Embedded Signup data missing: The WhatsApp connection flow did not complete properly. Please try again and ensure you complete all steps in the Meta signup popup, including selecting or creating a business and phone number.',
          details: 'No setup_data was received from the OAuth callback. This typically means the Embedded Signup flow was not initiated correctly or was cancelled.'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Step 3: Store the WhatsApp account in the database
    const { data, error } = await supabase
      .from('whatsapp_accounts')
      .upsert({
        workspace_id: effectiveWorkspaceId,
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

    // Step 4: Subscribe webhooks using SYSTEM USER TOKEN (server-to-server)
    console.log('📡 Setting up webhooks with system user token...');
    console.log('📊 Token type for webhooks: system user token (persistent, server-to-server)');
    
    try {
      const systemUserToken = Deno.env.get('META_SYSTEM_USER_TOKEN');
      
      if (!systemUserToken) {
        console.warn('⚠️ META_SYSTEM_USER_TOKEN not configured, skipping webhook subscription');
        console.warn('⚠️ Webhooks are required for receiving messages. Please configure the system user token.');
      } else {
        // Health check: Verify system token works
        console.log('🔍 Verifying system user token...');
        const healthCheck = await fetch(
          `https://graph.facebook.com/v24.0/${waba_id}?fields=id,name`,
          {
            headers: { 'Authorization': `Bearer ${systemUserToken}` }
          }
        );
        
        if (!healthCheck.ok) {
          const errorData = await healthCheck.json();
          console.error('❌ System user token health check failed:', errorData);
          console.error('⚠️ System user token may be invalid or lacks permissions on this WABA');
        } else {
          console.log('✅ System user token verified successfully');
        }
        
        // Subscribe webhooks using business-scoped endpoint with system token
        console.log(`🔗 Subscribing webhooks to WABA ${waba_id}...`);
        const webhookResponse = await fetch(
          `https://graph.facebook.com/v24.0/${waba_id}/subscribed_apps`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${systemUserToken}`
            }
          }
        );

        if (webhookResponse.ok) {
          const webhookData = await webhookResponse.json();
          console.log('✅ Webhook subscribed successfully:', webhookData);
          
          // Update webhook status
          await supabase
            .from('whatsapp_accounts')
            .update({ webhook_status: 'active' })
            .eq('id', data.id);
        } else {
          const errorData = await webhookResponse.json();
          console.error('❌ Failed to subscribe webhook:', errorData);
          console.error('⚠️ Webhooks not configured - messages will not be received');
        }
      }
    } catch (webhookError) {
      console.error('❌ Error subscribing webhook:', webhookError);
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