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
      state: stateParam,
      redirect_uri: clientRedirectUri,
      setup_data
    } = await req.json();

    if (!stateParam) {
      return new Response(
        JSON.stringify({ error: 'missing_state: OAuth state not provided. Please restart the connection from the app.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== BACKEND RECEIPT LOGGING ==========
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 BACKEND RECEIVED - OAuth Callback Data');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 Request payload:');
    console.log('   • workspace_id:', workspace_id);
    console.log('   • has_code:', !!code);
    console.log('   • has_state:', !!stateParam);
    console.log('   • client_redirect_uri:', clientRedirectUri);
    console.log('   • has_setup_data:', !!setup_data);
    
    if (setup_data) {
      const setupStr = JSON.stringify(setup_data);
      console.log('   • setup_data length:', setupStr.length);
      console.log('   • setup_data keys:', Object.keys(setup_data));
      console.log('   • setup_data snippet:', setupStr.substring(0, 200));
    }
    console.log('⏰ Backend timestamp:', new Date().toISOString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // CRITICAL: Fetch the EXACT redirect_uri, app_id, and workspace_id from database
    console.log('🔍 Looking up OAuth state in database...');
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_states')
      .select('redirect_uri, app_id, workspace_id')
      .eq('state', stateParam)
      .maybeSingle();
    
    if (stateError || !stateData) {
      console.error('❌ Failed to fetch oauth_state:', stateError);
      return new Response(
        JSON.stringify({ error: 'state_lookup_failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const redirect_uri = stateData.redirect_uri;
    const app_id = stateData.app_id || Deno.env.get('META_APP_ID')!;
    const effectiveWorkspaceId = stateData.workspace_id || workspace_id;
    
    console.log('✅ Retrieved from database:', { redirect_uri, app_id, workspace_id: effectiveWorkspaceId });
    
    // Allowlist valid redirect URIs
    const allowedRedirects = new Set([
      'https://preview--mono-commerce-chat.lovable.app/setup/whatsapp/callback',
      'https://mono-commerce-chat.lovable.app/setup/whatsapp/callback'
    ]);

    // Normalization helper for comparison (strip fragments and trailing slashes)
    const normalize = (u: string) => {
      try {
        const url = new URL(u);
        const path = url.pathname.replace(/\/+$/, '');
        return url.origin + path;
      } catch (_e) {
        return String(u).trim();
      }
    };

    // Log raw strings, lengths and char codes to catch hidden differences
    const logStr = (label: string, value: string | null | undefined) => {
      const v = (value ?? '');
      console.log(`${label}:`, v);
      console.log(`${label} length:`, v.length);
      console.log(`${label} charCodes:`, [...v].map((c) => c.charCodeAt(0)));
    };

    logStr('DB redirect_uri', redirect_uri);
    logStr('Client redirect_uri', clientRedirectUri);

    if (clientRedirectUri && redirect_uri && redirect_uri !== clientRedirectUri) {
      console.warn('Redirect URI mismatch', { dbRedirectUri: redirect_uri, clientRedirectUri });
      if (normalize(redirect_uri) !== normalize(clientRedirectUri)) {
        console.warn('Normalized redirect mismatch', { db: normalize(redirect_uri), client: normalize(clientRedirectUri) });
      }
    }

    // Prefer client-provided redirect_uri if allowlisted; otherwise fall back to DB value
    let chosenRedirectUri = redirect_uri;
    if (clientRedirectUri) {
      if (allowedRedirects.has(clientRedirectUri)) {
        chosenRedirectUri = clientRedirectUri;
      } else {
        console.warn('Client redirect_uri not in allowlist. Falling back to DB value.');
      }
    }

    console.log('Chosen redirect_uri:', chosenRedirectUri);
    
    // ========== MAIN FLOW: EXCHANGE CODE FOR CUSTOMER TOKEN ==========
    if (!code) {
      console.error('❌ No authorization code provided');
      return new Response(
        JSON.stringify({ error: 'Missing authorization code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!setup_data) {
      console.error('❌ No setup_data provided');
      return new Response(
        JSON.stringify({ error: 'Setup data missing: Unable to complete WhatsApp connection' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 STARTING TOKEN EXCHANGE');
    
    // IDEMPOTENCY: Reserve the OAuth code
    const { error: reserveError } = await supabase
      .from('oauth_code_uses')
      .insert({ 
        code, 
        workspace_id: effectiveWorkspaceId,
        provider: 'whatsapp'
      });

    if (reserveError) {
      console.error('OAuth code already used:', reserveError);
      return new Response(
        JSON.stringify({ 
          error: 'This authorization code has already been used. Please try connecting again.',
          code: 'CODE_ALREADY_USED'
        }),
        { 
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Step 1: Exchange code for customer-scoped access token
    const metaAppSecret = Deno.env.get('META_APP_SECRET')?.trim();
    if (!metaAppSecret) {
      throw new Error('META_APP_SECRET not configured');
    }

    console.log('🔑 Exchanging code for customer token...');
    console.log('Token POST redirect_uri:', chosenRedirectUri, 'encoded:', encodeURIComponent(chosenRedirectUri));
    console.log('Token POST redirect_uri length:', chosenRedirectUri.length);
    console.log('Token POST redirect_uri charCodes:', [...chosenRedirectUri].map((c) => c.charCodeAt(0)));
    
    const tokenParams = new URLSearchParams({
      client_id: app_id,
      client_secret: metaAppSecret,
      redirect_uri: chosenRedirectUri,
      code: code
    });
    console.log('Token POST body:', tokenParams.toString());
    
    const tokenResponse = await fetch('https://graph.facebook.com/v24.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      
      if (errorData.error?.error_subcode === 36009) {
        return new Response(
          JSON.stringify({ error: 'Authorization code already used' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Token exchange failed: ${JSON.stringify(errorData)}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('✅ Successfully obtained customer-scoped token');

    // Step 2: Extract WABA data from setup_data
    let waba_id: string;
    let phone_number_id: string;
    let displayPhoneNumber: string;
    let verifiedName: string;
    let business_id: string | undefined;

    console.log('📦 Processing setup_data...');
    
    // Handle different data shapes
    if (setup_data.whatsapp_business_account) {
      const wabaData = setup_data.whatsapp_business_account;
      waba_id = wabaData.id || wabaData.whatsapp_business_account_id;
      business_id = setup_data.business_id;
      
      const phoneNumbers = wabaData.phone_numbers || [];
      if (phoneNumbers.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No phone number found in setup data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const phoneNumber = phoneNumbers[0];
      phone_number_id = phoneNumber.id;
      displayPhoneNumber = phoneNumber.display_phone_number;
      verifiedName = phoneNumber.verified_name || displayPhoneNumber;
    } else if (setup_data.waba_id || setup_data.whatsapp_business_account_id) {
      waba_id = setup_data.waba_id || setup_data.whatsapp_business_account_id;
      business_id = setup_data.business_id;
      
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
          JSON.stringify({ error: 'No phone number ID found in setup data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.error('❌ Invalid setup data structure:', setup_data);
      return new Response(
        JSON.stringify({ error: 'Invalid setup data structure' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ WABA data extracted:', { waba_id, phone_number_id, displayPhoneNumber, business_id });

    // Step 3: Store WhatsApp account with CUSTOMER TOKEN
    console.log('💾 Storing WhatsApp account...');
    const { data, error } = await supabase
      .from('whatsapp_accounts')
      .upsert({
        workspace_id: effectiveWorkspaceId,
        waba_id: waba_id,
        phone_number_id: phone_number_id,
        phone_number: displayPhoneNumber,
        display_name: verifiedName,
        business_id: business_id,
        access_token: accessToken,
        token_type: 'customer',
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

    console.log('✅ WhatsApp account stored successfully');

    // Step 4: Subscribe webhooks using CUSTOMER TOKEN
    console.log('📡 Subscribing webhooks...');
    try {
      const webhookResponse = await fetch(
        `https://graph.facebook.com/v24.0/${waba_id}/subscribed_apps`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (webhookResponse.ok) {
        const webhookData = await webhookResponse.json();
        console.log('✅ Webhook subscribed successfully:', webhookData);
        
        await supabase
          .from('whatsapp_accounts')
          .update({ webhook_status: 'active' })
          .eq('id', data.id);
      } else {
        const errorData = await webhookResponse.json();
        console.error('❌ Failed to subscribe webhook:', errorData);
      }
    } catch (webhookError) {
      console.error('❌ Error subscribing webhook:', webhookError);
    }

    console.log('✅ WhatsApp connection complete!');
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
