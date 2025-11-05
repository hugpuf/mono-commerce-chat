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

    const { conversation_id, content } = await req.json();

    console.log('🧩 DEBUG START - send-whatsapp-message');
    console.log('conversation_id:', conversation_id);
    console.log('content length:', content?.length);

    // Get conversation details to extract workspace_id
    console.log('🔎 Fetching conversation...');
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, customer_phone, workspace_id')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      console.error('❌ Conversation not found:', convError);
      throw new Error('Conversation not found');
    }

    console.log('✅ Conversation found:', {
      id: conversation.id,
      workspace_id: conversation.workspace_id,
      customer_phone: conversation.customer_phone
    });

    // Fetch the MOST RECENT ACTIVE WhatsApp account for this workspace
    console.log('🔎 Fetching most recent active WhatsApp account for workspace...');
    const { data: whatsappAccount, error: waError } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('workspace_id', conversation.workspace_id)
      .neq('status', 'disconnected')
      .order('updated_at', { ascending: false })
      .maybeSingle();

    console.log('🔎 DB query result:', { 
      found: !!whatsappAccount, 
      error: waError,
      account_id: whatsappAccount?.id 
    });

    console.log('📦 WhatsApp account loaded:', {
      exists: !!whatsappAccount,
      has_access_token: !!whatsappAccount?.access_token,
      has_phone_number_id: !!whatsappAccount?.phone_number_id,
      status: whatsappAccount?.status,
      phone_number: whatsappAccount?.phone_number
    });

    // Comprehensive validation
    const missingFields: string[] = [];
    
    if (!whatsappAccount) {
      console.error('❌ No active WhatsApp account found for this workspace');
      throw new Error('❌ No active WhatsApp account found for this workspace. Please reconnect WhatsApp in Settings > Integrations.');
    }
    
    if (!whatsappAccount.access_token) {
      missingFields.push('access_token');
      console.error('❌ Missing access_token');
      throw new Error('❌ Missing access_token - please reconnect WhatsApp in Settings > Integrations');
    }
    
    if (!whatsappAccount.phone_number_id) {
      missingFields.push('phone_number_id');
      console.error('❌ Missing phone_number_id');
      throw new Error('❌ Missing phone_number_id - please reconnect WhatsApp in Settings > Integrations');
    }
    
    if (whatsappAccount.status === 'disconnected') {
      console.error(`❌ WhatsApp account is disconnected: ${whatsappAccount.status}`);
      throw new Error('❌ WhatsApp account is disconnected - please reconnect in Settings > Integrations');
    }

    console.log('✅ WhatsApp account validated successfully');
    console.log('🔧 SUMMARY: All required fields present');

    // Send message via Meta Graph API
    console.log('📤 Sending message to Meta Graph API...');
    console.log('📤 Payload:', {
      phone_number_id: whatsappAccount.phone_number_id,
      to: conversation.customer_phone,
      content_preview: content?.substring(0, 50) + (content?.length > 50 ? '...' : '')
    });

    const metaResponse = await fetch(
      `https://graph.facebook.com/v24.0/${whatsappAccount.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappAccount.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: conversation.customer_phone,
          type: 'text',
          text: {
            body: content,
          },
        }),
      }
    );

    if (!metaResponse.ok) {
      const errorText = await metaResponse.text();
      console.error('❗ Meta API Response Error:', {
        status: metaResponse.status,
        statusText: metaResponse.statusText,
        body: errorText
      });
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: { message: errorText } };
      }
      
      throw new Error(`Failed to send message: ${errorData.error?.message || errorText || 'Unknown error'}`);
    }

    const metaData = await metaResponse.json();
    console.log('✅ Message sent successfully:', metaData);

    // Store the sent message in database
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        direction: 'outbound',
        from_number: whatsappAccount.phone_number,
        to_number: conversation.customer_phone,
        content: content,
        message_type: 'text',
        status: 'sent',
        whatsapp_message_id: metaData.messages?.[0]?.id,
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error storing message:', messageError);
      throw messageError;
    }

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation.id);

    console.log('Message stored in database');

    return new Response(
      JSON.stringify({ success: true, message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-whatsapp-message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
