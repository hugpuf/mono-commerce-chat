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

    console.log('Sending WhatsApp message:', { conversation_id, content });

    // Get conversation and WhatsApp account details
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        customer_phone,
        whatsapp_account_id,
        whatsapp_accounts (
          phone_number_id,
          phone_number,
          access_token
        )
      `)
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      console.error('Conversation not found:', convError);
      throw new Error('Conversation not found');
    }

    const whatsappAccount = conversation.whatsapp_accounts as any;
    
    if (!whatsappAccount.access_token) {
      throw new Error('WhatsApp account not properly configured');
    }

    // Send message via Meta Graph API
    const metaResponse = await fetch(
      `https://graph.facebook.com/v21.0/${whatsappAccount.phone_number_id}/messages`,
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
      const errorData = await metaResponse.json();
      console.error('Meta API error:', errorData);
      throw new Error(`Failed to send message: ${errorData.error?.message || 'Unknown error'}`);
    }

    const metaData = await metaResponse.json();
    console.log('Message sent successfully:', metaData);

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
