import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle GET request for webhook verification
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      console.log('Webhook verification request:', { mode, token });

      if (mode === 'subscribe' && token) {
        // Verify the token matches one in our database
        const { data: account } = await supabase
          .from('whatsapp_accounts')
          .select('webhook_verify_token')
          .eq('webhook_verify_token', token)
          .single();

        if (account) {
          console.log('Webhook verified successfully');
          return new Response(challenge, { status: 200 });
        }
      }

      return new Response('Forbidden', { status: 403 });
    }

    // Handle POST request for incoming messages
    if (req.method === 'POST') {
      const payload = await req.json();
      console.log('Received webhook payload:', JSON.stringify(payload, null, 2));

      // Extract message data from Meta webhook payload
      const entry = payload.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;
      const contacts = value?.contacts;
      const metadata = value?.metadata;

      if (!messages || messages.length === 0) {
        console.log('No messages in payload, possibly a status update');
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const message = messages[0];
      const contact = contacts?.[0];
      const customerPhone = message.from;
      const customerName = contact?.profile?.name || customerPhone;
      const phoneNumberId = metadata?.phone_number_id;

      console.log('Processing message:', {
        customerPhone,
        customerName,
        phoneNumberId,
        messageType: message.type,
      });

      // Find the WhatsApp account
      const { data: whatsappAccount, error: accountError } = await supabase
        .from('whatsapp_accounts')
        .select('id, workspace_id')
        .eq('phone_number_id', phoneNumberId)
        .single();

      if (accountError || !whatsappAccount) {
        console.error('WhatsApp account not found:', accountError);
        return new Response(JSON.stringify({ error: 'Account not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Find or create conversation
      let conversation;
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('whatsapp_account_id', whatsappAccount.id)
        .eq('customer_phone', customerPhone)
        .single();

      if (existingConv) {
        conversation = existingConv;
        
        // Update conversation
        await supabase
          .from('conversations')
          .update({
            last_message_at: new Date().toISOString(),
            customer_name: customerName,
          })
          .eq('id', existingConv.id);
      } else {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            workspace_id: whatsappAccount.workspace_id,
            whatsapp_account_id: whatsappAccount.id,
            customer_phone: customerPhone,
            customer_name: customerName,
            status: 'open',
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (convError) {
          console.error('Error creating conversation:', convError);
          throw convError;
        }
        conversation = newConv;
      }

      // Extract message content based on type
      let messageContent = '';
      let messageType = 'text';
      let messageMetadata: any = {};

      if (message.type === 'text') {
        messageContent = message.text.body;
      } else if (message.type === 'image') {
        messageType = 'image';
        messageContent = message.image.caption || 'Image';
        messageMetadata = { image_id: message.image.id };
      } else if (message.type === 'document') {
        messageType = 'document';
        messageContent = message.document.filename || 'Document';
        messageMetadata = { document_id: message.document.id };
      } else {
        messageContent = `[${message.type}]`;
      }

      // Store the message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          direction: 'inbound',
          from_number: customerPhone,
          to_number: metadata?.display_phone_number || '',
          content: messageContent,
          message_type: messageType,
          status: 'delivered',
          whatsapp_message_id: message.id,
          metadata: messageMetadata,
        });

      if (messageError) {
        console.error('Error storing message:', messageError);
        throw messageError;
      }

      console.log('Message stored successfully');

      // Invoke AI handler (server-origin AI)
      console.log('🤖 Triggering AI handler from webhook');
      try {
        const aiHandlerResponse = await supabase.functions.invoke('whatsapp-ai-handler', {
          body: {
            conversationId: conversation.id,
            customerMessage: messageContent,
            workspaceId: whatsappAccount.workspace_id,
          },
        });

        if (aiHandlerResponse.error) {
          console.error('❌ AI handler error:', aiHandlerResponse.error);
        } else {
          console.log('✅ AI handler completed:', aiHandlerResponse.data);
        }
      } catch (aiError) {
        console.error('❌ AI handler exception:', aiError);
        // Don't fail the webhook if AI fails
      }

      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    console.error('Error in whatsapp-webhook:', error);
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
