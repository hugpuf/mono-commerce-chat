import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const formData = await req.formData();
    const signedRequest = formData.get('signed_request') as string;

    if (!signedRequest) {
      throw new Error('Missing signed_request parameter');
    }

    console.log('Received Meta data deletion callback');

    // Parse the signed request
    const [encodedSig, payload] = signedRequest.split('.');
    
    // Verify signature
    const appSecret = Deno.env.get('META_APP_SECRET');
    if (!appSecret) {
      throw new Error('META_APP_SECRET not configured');
    }

    // Use Web Crypto API for HMAC
    const encoder = new TextEncoder();
    const keyData = encoder.encode(appSecret);
    const messageData = encoder.encode(payload);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    const expectedSig = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    if (encodedSig !== expectedSig) {
      throw new Error('Invalid signature');
    }

    // Decode payload
    const decodedPayload = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    );

    const userId = decodedPayload.user_id;
    console.log('Data deletion requested for user:', userId);

    // Find workspace associated with this Meta user
    // This assumes you store Meta user ID in whatsapp_accounts or user_profiles metadata
    const { data: accounts, error: accountError } = await supabase
      .from('whatsapp_accounts')
      .select('workspace_id')
      .limit(1);

    if (accountError || !accounts || accounts.length === 0) {
      console.log('No workspace found for user, returning success anyway');
    }

    let deletionRequestId = null;
    let confirmationCode = null;

    if (accounts && accounts.length > 0) {
      const workspaceId = accounts[0].workspace_id;

      // Create full deletion request
      const { data: deletionRequest, error: requestError } = await supabase
        .from('data_deletion_requests')
        .insert({
          workspace_id: workspaceId,
          requested_by: null, // Meta-initiated
          deletion_type: 'full',
          deletion_scope: ['all'],
          status: 'pending',
          metadata: {
            source: 'meta_callback',
            meta_user_id: userId,
          },
        })
        .select()
        .single();

      if (requestError) {
        console.error('Error creating deletion request:', requestError);
        throw new Error('Failed to create deletion request');
      }

      deletionRequestId = deletionRequest.id;
      confirmationCode = deletionRequest.confirmation_code;

      console.log('Created deletion request:', deletionRequestId);

      // Trigger async deletion via edge function
      const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/delete-workspace-data`;
      
      // Fire and forget - don't await
      fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          workspaceId,
          deletionType: 'full',
          deletionScope: ['all'],
        }),
      }).catch(err => console.error('Error triggering deletion:', err));
    }

    // Return response in Meta's expected format
    const statusUrl = deletionRequestId 
      ? `${Deno.env.get('SUPABASE_URL')}/deletion-status?id=${deletionRequestId}`
      : `${Deno.env.get('SUPABASE_URL')}/deletion-status`;

    return new Response(
      JSON.stringify({
        url: statusUrl,
        confirmation_code: confirmationCode || 'N/A',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in meta-data-deletion-callback:', error);
    
    // Always return 200 to Meta to avoid retries
    return new Response(
      JSON.stringify({
        url: `${Deno.env.get('SUPABASE_URL')}/deletion-status`,
        confirmation_code: 'ERROR',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
