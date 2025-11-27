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

      // Check for duplicate message (deduplication)
      const { data: existingMessage } = await supabase
        .from('messages')
        .select('id')
        .eq('whatsapp_message_id', message.id)
        .maybeSingle();

      if (existingMessage) {
        console.log('⚠️ Duplicate message detected, skipping:', message.id);
        return new Response(JSON.stringify({ status: 'ok', duplicate: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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

      // Check AI mode
      const { data: aiSettings } = await supabase
        .from('workspace_ai_settings')
        .select('mode')
        .eq('workspace_id', whatsappAccount.workspace_id)
        .single();

      const aiMode = aiSettings?.mode || 'manual';
      console.log('🎯 AI Mode:', aiMode);

      // Manual mode: skip locking/processing entirely
      if (aiMode === 'manual') {
        console.log('⏸️  Manual mode - no locking or AI processing');
        return new Response(JSON.stringify({ status: 'ok', mode: 'manual' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // === CONVERSATION LOCKING & BUFFERING ===
      
      const DEBOUNCE_DELAY = 2000; // 2 seconds
      const instanceId = crypto.randomUUID(); // Unique ID for this invocation

      console.log('🔐 Attempting to acquire conversation lock...', { conversationId: conversation.id, instanceId });

      // Try to acquire lock
      const { data: lockAcquired, error: lockError } = await supabase.rpc('try_conversation_lock', {
        p_conversation_id: conversation.id,
        p_instance_id: instanceId
      });

      if (lockError) {
        console.error('❌ Lock acquisition error:', lockError);
        throw lockError;
      }

      if (!lockAcquired) {
        // Lock already held - buffer this message
        console.log('🔒 Conversation locked by another process - buffering message');
        
        const { data: currentConv } = await supabase
          .from('conversations')
          .select('message_buffer')
          .eq('id', conversation.id)
          .single();

        const currentBuffer = currentConv?.message_buffer || [];
        const updatedBuffer = [...currentBuffer, messageContent];

        await supabase
          .from('conversations')
          .update({ 
            message_buffer: updatedBuffer,
            last_message_at: new Date().toISOString()
          })
          .eq('id', conversation.id);

        console.log(`📦 Message buffered. Buffer size: ${updatedBuffer.length}`);
        
        return new Response(JSON.stringify({ status: 'buffered', buffer_size: updatedBuffer.length }), {
          status: 202,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Lock acquired! Initialize buffer with current message
      console.log('✅ Lock acquired - initializing buffer and starting debounce');
      await supabase
        .from('conversations')
        .update({ message_buffer: [messageContent] })
        .eq('id', conversation.id);

      // Send typing indicator
      try {
        console.log('⌨️ Sending typing indicator...');
        const { data: whatsappDetails } = await supabase
          .from('whatsapp_accounts')
          .select('access_token, phone_number_id')
          .eq('id', whatsappAccount.id)
          .single();

        if (whatsappDetails?.access_token && whatsappDetails?.phone_number_id) {
          const typingUrl = `https://graph.facebook.com/v18.0/${whatsappDetails.phone_number_id}/messages`;
          await fetch(typingUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whatsappDetails.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              status: 'read',
              message_id: message.id,
              typing_indicator: { type: 'text' }
            })
          });
          console.log('✅ Typing indicator sent');
        }
      } catch (typingError) {
        console.error('⚠️ Typing indicator error (non-blocking):', typingError);
      }

      // Debounce and process using EdgeRuntime.waitUntil for reliability
      const debounceAndProcess = async () => {
        // Wait for debounce period
        await new Promise(resolve => setTimeout(resolve, DEBOUNCE_DELAY));
        
        console.log(`⏱️ Debounce complete (${DEBOUNCE_DELAY}ms) - triggering AI handler`);
        
        // Call AI handler
        try {
          const aiHandlerResponse = await supabase.functions.invoke('whatsapp-ai-handler', {
            body: {
              conversationId: conversation.id,
              workspaceId: whatsappAccount.workspace_id,
              instanceId: instanceId,
              whatsappMessageId: message.id,
            },
          });

          if (aiHandlerResponse.error) {
            console.error('❌ AI handler error:', aiHandlerResponse.error);
            
            // Emergency unlock on failure
            try {
              await supabase.rpc('release_conversation_lock', {
                p_conversation_id: conversation.id,
                p_instance_id: instanceId
              });
              console.log('🔓 Emergency unlock performed');
            } catch (unlockError) {
              console.error('❌ Emergency unlock failed:', unlockError);
            }
          } else {
            console.log('✅ AI handler completed:', aiHandlerResponse.data);
          }
        } catch (aiError) {
          console.error('❌ AI handler exception:', aiError);
          
          // Emergency unlock on failure
          try {
            await supabase.rpc('release_conversation_lock', {
              p_conversation_id: conversation.id,
              p_instance_id: instanceId
            });
            console.log('🔓 Emergency unlock performed');
          } catch (unlockError) {
            console.error('❌ Emergency unlock failed:', unlockError);
          }
        }
      };

      // Use EdgeRuntime.waitUntil to ensure task completes even if function instance shuts down
      const edgeRuntime = (globalThis as any).EdgeRuntime;
      if (edgeRuntime && typeof edgeRuntime.waitUntil === 'function') {
        edgeRuntime.waitUntil(debounceAndProcess());
      } else {
        // Fallback for local development
        debounceAndProcess();
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
