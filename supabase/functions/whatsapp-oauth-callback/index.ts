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

    const payload = await req.json();

    const {
      code,
      workspace_id,
      state: stateParam,
      setup_data
    } = payload;

    // ========== BACKEND RECEIPT LOGGING ==========
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 BACKEND RECEIVED', {
      has_code: !!code,
      has_setup_data: !!setup_data,
      workspace_id,
      timestamp: new Date().toISOString()
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // ========== STATE VALIDATION ==========
    console.log('🔍 STAGE: state_validation');
    try {
      if (!stateParam) {
        throw new Error('OAuth state not provided. Please restart the connection from the app.');
      }
      console.log('✅ State validation passed');
    } catch (err: any) {
      console.error('❌ State validation failed:', err.message);
      return new Response(
        JSON.stringify({ 
          success: false,
          stage: 'state_validation', 
          error: err.message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // CRITICAL: Fetch the Meta app ID and workspace scope from database
    console.log('🔍 STAGE: db_lookup');
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_states')
      .select('app_id, workspace_id')
      .eq('state', stateParam)
      .maybeSingle();
    
    if (stateError || !stateData) {
      console.error('❌ Failed to fetch oauth_state:', stateError);
      return new Response(
        JSON.stringify({ 
          success: false,
          stage: 'db_lookup', 
          error: 'State lookup failed' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const app_id = stateData.app_id || Deno.env.get('META_APP_ID')!;
    const effectiveWorkspaceId = stateData.workspace_id || workspace_id;

    console.log('✅ Retrieved from database:', {
      app_id,
      workspace_id: effectiveWorkspaceId
    });
    console.log('Using Meta managed redirect configuration; no redirect_uri parameter will be sent during token exchange.');
    
    // ========== MAIN FLOW: EXCHANGE CODE FOR CUSTOMER TOKEN ==========
    console.log('🔍 STAGE: token_exchange_preparation');
    try {
      if (!code) {
        throw new Error('Missing authorization code');
      }

      if (!setup_data) {
        throw new Error('Setup data missing: Unable to complete WhatsApp connection');
      }
      console.log('✅ Code and setup_data validation passed');
    } catch (err: any) {
      console.error('❌ Pre-exchange validation failed:', err.message);
      return new Response(
        JSON.stringify({ 
          success: false,
          stage: 'token_exchange_preparation', 
          error: err.message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // IDEMPOTENCY: Reserve the OAuth code
    console.log('🔍 STAGE: idempotency_check');
    const { error: reserveError } = await supabase
      .from('oauth_code_uses')
      .insert({ 
        code, 
        workspace_id: effectiveWorkspaceId,
        provider: 'whatsapp'
      });

    if (reserveError) {
      console.error('❌ OAuth code already used:', reserveError);
      return new Response(
        JSON.stringify({ 
          success: false,
          stage: 'idempotency_check',
          error: 'This authorization code has already been used. Please try connecting again.',
          code: 'CODE_ALREADY_USED'
        }),
        { 
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    console.log('✅ Code reserved successfully');

    // Step 1: Exchange code for customer-scoped access token
    console.log('🔄 STAGE: token_exchange');
    const metaAppSecret = Deno.env.get('META_APP_SECRET')?.trim();
    if (!metaAppSecret) {
      return new Response(
        JSON.stringify({ 
          success: false,
          stage: 'token_exchange',
          error: 'META_APP_SECRET not configured' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      console.log('🔑 Exchanging code for customer token...');
      console.log('🔍 Relying on Meta configured redirect target (no redirect_uri parameter sent).');

      const tokenParams = new URLSearchParams();
      tokenParams.append('client_id', app_id);
      tokenParams.append('client_secret', metaAppSecret);
      tokenParams.append('code', code);
      
      console.log('Token POST body:', tokenParams.toString());
      
      const tokenResponse = await fetch('https://graph.facebook.com/v24.0/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams
      });

      const responseText = await tokenResponse.text();
      console.log('Token POST status:', tokenResponse.status);
      console.log('Token POST response snippet:', responseText.slice(0, 400));

      if (!tokenResponse.ok) {
        const errorData = JSON.parse(responseText);
        console.error('❌ Token exchange failed:', errorData);
        
        if (errorData.error?.error_subcode === 36009) {
          return new Response(
            JSON.stringify({ 
              success: false,
              stage: 'token_exchange',
              error: 'Authorization code already used' 
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error(`Token exchange failed: ${responseText}`);
      }

      const tokenData = JSON.parse(responseText);
      const accessToken = tokenData.access_token;
      console.log('✅ Token exchange succeeded:', {
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in
      });

      // Step 2: Extract WABA data from setup_data
      console.log('🔍 STAGE: setup_data_extraction');
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
          throw new Error('No phone number found in setup data');
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
          throw new Error('No phone number ID found in setup data');
        }
      } else {
        console.error('❌ Invalid setup data structure:', setup_data);
        throw new Error('Invalid setup data structure');
      }

      console.log('✅ WABA data extracted:', { waba_id, phone_number_id, displayPhoneNumber, business_id });

      // Step 3: Store WhatsApp account with CUSTOMER TOKEN
      console.log('🔍 STAGE: db_upsert');
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
          onConflict: 'workspace_id,phone_number_id'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error storing WhatsApp account:', error);
        throw error;
      }

      console.log('✅ WhatsApp account stored successfully');

      // Step 4: Subscribe webhooks using CUSTOMER TOKEN
      console.log('🔍 STAGE: webhook_subscription');
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
        JSON.stringify({ 
          success: true, 
          stage: 'complete',
          account_id: data.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (err: any) {
      console.error('❌ Token exchange stage error:', err.message);
      console.error('Stack trace:', err.stack);
      return new Response(
        JSON.stringify({ 
          success: false,
          stage: 'token_exchange', 
          error: err.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    console.error('❌ Top-level error in whatsapp-oauth-callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error message:', errorMessage);
    if (errorStack) {
      console.error('Stack trace:', errorStack);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        stage: 'unknown',
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
