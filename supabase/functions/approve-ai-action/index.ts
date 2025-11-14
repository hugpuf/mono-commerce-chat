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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { approvalId, approved, rejectionReason, optimisticMessageId } = await req.json();

    console.log('🔐 Approval request:', { approvalId, approved, userId: user.id });

    // Fetch the pending approval
    const { data: approval, error: fetchError } = await supabaseClient
      .from('ai_pending_approvals')
      .select('*, conversations(workspace_id)')
      .eq('id', approvalId)
      .single();

    if (fetchError || !approval) {
      throw new Error('Approval not found');
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (approved) {
      // Update approval status immediately
      await serviceClient
        .from('ai_pending_approvals')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', approvalId);

      // Execute the action in background (fire and forget)
      const { action_type, action_payload, conversation_id } = approval;
      
      // Don't await this - let it run in background
      (async () => {
        console.log('🔄 Background: Executing approved action:', action_type);

        let result = 'success';
        let errorMessage = null;

        try {
          // Execute based on action type
          if (action_type === 'send_message') {
            const { data: conversation } = await serviceClient
              .from('conversations')
              .select('customer_phone, whatsapp_account_id')
              .eq('id', conversation_id)
              .single();

            if (conversation) {
              await serviceClient.functions.invoke('send-whatsapp-message', {
                body: {
                  conversation_id: conversation_id,
                  content: action_payload.message,
                }
              });
            }
          } else if (action_type === 'add_to_cart') {
            const { data: conv } = await serviceClient
              .from('conversations')
              .select('cart_items, cart_total')
              .eq('id', conversation_id)
              .single();

            const cartItems = conv?.cart_items || [];
            cartItems.push(action_payload);

            await serviceClient
              .from('conversations')
              .update({ 
                cart_items: cartItems,
                cart_total: cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
              })
              .eq('id', conversation_id);
          }
        } catch (error) {
          console.error('Background action execution failed:', error);
          result = 'failed';
          errorMessage = error instanceof Error ? error.message : 'Unknown error';
        }

        // Log the action
        await serviceClient
          .from('ai_action_log')
          .insert({
            workspace_id: approval.conversations.workspace_id,
            conversation_id: conversation_id,
            action_type,
            action_payload,
            confidence_score: approval.confidence_score,
            mode: 'hitl',
            execution_method: 'approved',
            result,
            error_message: errorMessage
          });

        console.log('✅ Background action completed:', result);
      })().catch((err) => console.error('Background task error:', err));

      // Return immediately
      return new Response(
        JSON.stringify({ success: true, optimisticMessageId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Reject the action
      await serviceClient
        .from('ai_pending_approvals')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', approvalId);

      // Log rejection
      await serviceClient
        .from('ai_action_log')
        .insert({
          workspace_id: approval.conversations.workspace_id,
          conversation_id: approval.conversation_id,
          action_type: approval.action_type,
          action_payload: approval.action_payload,
          confidence_score: approval.confidence_score,
          mode: 'hitl',
          execution_method: 'approved',
          result: 'rejected',
          error_message: rejectionReason
        });

      return new Response(
        JSON.stringify({ success: true, rejected: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Approval error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
