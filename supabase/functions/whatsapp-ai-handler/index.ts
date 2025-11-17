import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  checkQuietHours, 
  analyzeSentiment, 
  shouldInjectCompliance,
  evaluateGuardrailRules,
  checkEscalationPolicies,
  isWithinBusinessHours,
  validateComplianceChecks
} from "./utils.ts";
import { buildSystemPrompt } from "./parent-prompt.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { conversationId, customerMessage, workspaceId } = await req.json();

    console.log('🤖 AI Handler - Processing message:', { conversationId, workspaceId });

    // Parallelize all database reads for performance
    const [
      { data: aiSettings },
      { data: messages },
      { data: conversation },
      { data: workspace },
      { count: productCount }
    ] = await Promise.all([
      supabaseClient
        .from('workspace_ai_settings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single(),
      supabaseClient
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20),
      supabaseClient
        .from('conversations')
        .select('*, whatsapp_accounts(*)')
        .eq('id', conversationId)
        .single(),
      supabaseClient
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single(),
      supabaseClient
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
    ]);

    const mode = aiSettings?.mode || 'manual';
    const confidenceThreshold = aiSettings?.confidence_threshold || 0.7;
    const quietHours = aiSettings?.quiet_hours || [];

    console.log('🔧 AI Settings:', { mode, confidenceThreshold, quietHours });

    // Check if we're in quiet hours
    const isQuietHours = await checkQuietHours(quietHours, workspace?.timezone || 'UTC');
    if (isQuietHours) {
      console.log('🌙 Quiet hours active - queueing message for later');
      return new Response(
        JSON.stringify({ 
          message: "Thank you for your message. Our team will respond during business hours.",
          queued: true,
          quiet_hours: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // MANUAL MODE: COMPLETELY PASSIVE - AI does not run
    if (mode === 'manual') {
      console.log('⏸️  Manual mode active - no AI response generated');
      return new Response(
        JSON.stringify({ 
          message: "Manual mode active - no AI response generated",
          mode: 'manual'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Build conversation history for AI
    const conversationHistory = messages?.map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content
    })) || [];

    // Define AI tools
    const tools = [
      {
        type: "function",
        function: {
          name: "search_products",
          description: "Search the product catalog by name, category, keywords, or description. Use this when customer wants to browse or find products.",
          parameters: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "What to search for (e.g., 'running shoes', 'Nike', 'red dress')" 
              },
              category: { 
                type: "string", 
                description: "Optional category filter" 
              },
              max_price: { 
                type: "number", 
                description: "Optional maximum price filter" 
              }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "add_to_cart",
          description: "Add a product to the customer's shopping cart. Use this when customer explicitly says they want to buy or add something.",
          parameters: {
            type: "object",
            properties: {
              product_id: { type: "string", description: "UUID of the product" },
              quantity: { type: "number", description: "Quantity to add", default: 1 },
              variant_info: { 
                type: "string", 
                description: "Size, color, or other variant details if mentioned" 
              }
            },
            required: ["product_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "view_cart",
          description: "Show the customer their current shopping cart contents and total.",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },
      {
        type: "function",
        function: {
          name: "remove_from_cart",
          description: "Remove a product from the cart.",
          parameters: {
            type: "object",
            properties: {
              product_id: { type: "string", description: "UUID of product to remove" }
            },
            required: ["product_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_checkout",
          description: "Generate a payment link for checkout. Use this when customer is ready to pay or says 'checkout', 'buy now', 'I'll take it', etc.",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },
      {
        type: "function",
        function: {
          name: "check_order_status",
          description: "Look up order status and tracking information.",
          parameters: {
            type: "object",
            properties: {
              order_number: { 
                type: "string", 
                description: "Order number if customer provides it" 
              }
            }
          }
        }
      }
    ];

    // Build system prompt using layered hierarchy
    const systemPrompt = buildSystemPrompt({
      workspace,
      aiSettings,
      conversation,
      productCount: productCount || 0
    });

    // Call Lovable AI
    console.log('🤖 Calling Lovable AI...');
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: customerMessage }
        ],
        tools: tools,
        tool_choice: "auto"
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('🤖 AI Response:', JSON.stringify(aiData, null, 2));

    let finalResponse = aiData.choices[0].message.content || "";
    const toolCalls = aiData.choices[0].message.tool_calls;

    // Execute tool calls
    if (toolCalls && toolCalls.length > 0) {
      console.log('🔧 Tool calls detected:', toolCalls.length);
      
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        console.log(`🔧 Executing tool: ${toolName}`, toolArgs);

        let toolResult;

        switch (toolName) {
          case "search_products":
            toolResult = await executeSearchProducts(supabaseClient, workspaceId, toolArgs);
            break;
          case "add_to_cart":
            toolResult = await executeAddToCart(supabaseClient, conversationId, toolArgs);
            break;
          case "view_cart":
            toolResult = await executeViewCart(supabaseClient, conversationId);
            break;
          case "remove_from_cart":
            toolResult = await executeRemoveFromCart(supabaseClient, conversationId, toolArgs);
            break;
          case "create_checkout":
            toolResult = await executeCreateCheckout(supabaseClient, conversation, workspace);
            break;
          case "check_order_status":
            toolResult = await executeCheckOrderStatus(supabaseClient, conversation.customer_phone, toolArgs);
            break;
          default:
            toolResult = { error: "Unknown tool" };
        }

        console.log(`✅ Tool result for ${toolName}:`, toolResult);

        // Call AI again with tool result to get natural language response
        const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              ...conversationHistory,
              { role: "user", content: customerMessage },
              aiData.choices[0].message,
              {
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolResult)
              }
            ]
          })
        });

        const followUpData = await followUpResponse.json();
        finalResponse = followUpData.choices[0].message.content;
      }
    }

    // === PHASE 2: STRUCTURED RULE EVALUATION ENGINE ===
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Analyze sentiment for rules and escalation
    console.log('🎭 Analyzing customer sentiment...');
    const sentimentScore = await analyzeSentiment(customerMessage);
    console.log(`🎭 Sentiment score: ${sentimentScore}`);

    // Evaluate guardrail rules against AI response
    console.log('🛡️ Evaluating guardrail rules...');
    const guardrailViolations = await evaluateGuardrailRules(
      finalResponse,
      { 
        sentimentScore,
        lastMessage: customerMessage,
        cart_total: conversation.cart_total,
        messageCount: messages?.length || 0,
        lastMessageAt: conversation.last_message_at
      },
      workspaceId,
      supabaseUrl,
      supabaseServiceKey
    );

    // Handle critical violations (block enforcement)
    const criticalViolations = guardrailViolations.filter(v => v.enforcement === 'block');
    if (criticalViolations.length > 0) {
      console.log('🚫 Critical guardrail violations detected:', criticalViolations);
      
      const fallback = criticalViolations[0].fallbackMessage || 
        'I apologize, but I cannot provide that information. Please contact our support team for assistance.';
      
      await supabaseClient.from('ai_action_log').insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        action_type: 'guardrail_block',
        action_payload: { violations: criticalViolations, originalResponse: finalResponse },
        result: 'blocked',
        mode: aiSettings.mode,
        execution_method: 'automatic',
        confidence_score: null
      });

      finalResponse = fallback;
    }

    // Check escalation policies
    console.log('📋 Checking escalation policies...');
    const escalationMatch = await checkEscalationPolicies(
      {
        sentimentScore,
        confidenceScore: 0, // Will be calculated later
        lastMessage: customerMessage,
        cart_total: conversation.cart_total,
        messageCount: messages?.length || 0,
        lastMessageAt: conversation.last_message_at
      },
      workspaceId,
      supabaseUrl,
      supabaseServiceKey
    );

    let forceEscalation = false;
    let escalationReason = '';
    
    if (escalationMatch) {
      forceEscalation = true;
      escalationReason = `Escalation policy "${escalationMatch.policyName}" triggered (${escalationMatch.triggers.join(', ')})`;
      console.log('⚠️ Escalation policy matched:', escalationMatch);
    }

    // Legacy sentiment-based escalation (fallback)
    if (!forceEscalation && sentimentScore < -0.7) {
      forceEscalation = true;
      escalationReason = `High negative sentiment detected (${sentimentScore.toFixed(2)})`;
    }

    // Validate compliance checks
    console.log('✅ Validating compliance checks...');
    const complianceResult = await validateComplianceChecks(
      finalResponse,
      { lastMessage: customerMessage },
      workspaceId,
      supabaseUrl,
      supabaseServiceKey
    );

    // If required compliance failed, block the message
    if (!complianceResult.passed && complianceResult.required) {
      console.log('❌ Required compliance checks failed:', complianceResult.checksFailed);
      
      await supabaseClient.from('ai_action_log').insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        action_type: 'compliance_block',
        action_payload: { checksFailed: complianceResult.checksFailed, originalResponse: finalResponse },
        result: 'blocked',
        mode: aiSettings.mode,
        execution_method: 'automatic',
        confidence_score: null
      });

      finalResponse = 'I apologize, but I need to verify some information before proceeding. A team member will assist you shortly.';
      forceEscalation = true;
      escalationReason = escalationReason || 'Required compliance validation failed';
    }

    // Inject compliance suggestions
    if (complianceResult.suggestions.length > 0) {
      finalResponse += '\n\n' + complianceResult.suggestions.join('\n\n');
    }

    // Legacy compliance injection (backwards compatibility)
    if (aiSettings?.compliance_notes && shouldInjectCompliance(customerMessage, aiSettings.compliance_notes)) {
      if (!finalResponse.includes(aiSettings.compliance_notes)) {
        console.log('📋 Injecting legacy compliance notes');
        finalResponse += `\n\n${aiSettings.compliance_notes}`;
      }
    }
    
    // === END PHASE 2 INTEGRATION ===

    // Calculate confidence score using parent prompt rubric
    console.log('📊 Calculating confidence score (Parent Prompt Rubric)...');
    
    // Start with base confidence
    let aiConfidenceScore = 0.85; // Default HIGH-MEDIUM
    
    const confidenceFactors = {
      sentiment: sentimentScore,
      cartValue: Number(conversation?.cart_total || 0),
      messageComplexity: finalResponse.length,
      guardrailViolations: guardrailViolations.length,
      escalationMatch: escalationMatch ? true : false,
      toolCallsCount: toolCalls?.length || 0,
      uncertaintyWords: (finalResponse.match(/\b(maybe|might|possibly|uncertain|not sure|I think|probably)\b/gi) || []).length
    };
    
    console.log('🎯 Confidence Factors:', confidenceFactors);
    
    // Apply parent prompt rubric adjustments
    
    // CRITICAL ESCALATION TRIGGERS (Force LOW confidence)
    if (confidenceFactors.cartValue > 1000) {
      aiConfidenceScore = 0.5; // Force escalation for high-value
      console.log('🚨 CRITICAL: Cart value > $1000 - forcing escalation');
    } else if (confidenceFactors.escalationMatch) {
      aiConfidenceScore = 0.0; // Force escalation
      console.log('🚨 CRITICAL: Escalation policy matched - forcing human review');
    } else if (confidenceFactors.sentiment < -0.3) {
      aiConfidenceScore = 0.6; // LOW confidence for negative sentiment
      console.log('⚠️ WARNING: Negative sentiment detected - reducing confidence');
    } else if (customerMessage.toLowerCase().match(/\b(refund|return|complaint|manager|human|speak to someone)\b/)) {
      aiConfidenceScore = 0.5; // Force escalation for critical keywords
      console.log('🚨 CRITICAL: Escalation keyword detected');
    } else {
      // Standard confidence calculation (HIGH/MEDIUM range)
      
      // Penalty for uncertainty language
      if (confidenceFactors.uncertaintyWords > 0) {
        aiConfidenceScore -= (confidenceFactors.uncertaintyWords * 0.05);
        console.log(`⚠️ Uncertainty words detected (${confidenceFactors.uncertaintyWords}) - reducing confidence`);
      }
      
      // Penalty for excessive response length (violates brevity mandate)
      if (confidenceFactors.messageComplexity > 300) {
        aiConfidenceScore -= 0.1;
        console.log('⚠️ Response too long (>300 chars) - violates brevity mandate');
      }
      
      // Penalty for guardrail violations
      if (confidenceFactors.guardrailViolations > 0) {
        aiConfidenceScore -= (confidenceFactors.guardrailViolations * 0.15);
        console.log(`⚠️ Guardrail violations (${confidenceFactors.guardrailViolations}) - reducing confidence`);
      }
      
      // Penalty for high cart value (not critical threshold yet)
      if (confidenceFactors.cartValue > 500) {
        aiConfidenceScore -= 0.1;
        console.log('⚠️ Cart value > $500 - slight confidence reduction');
      }
      
      // Bonus for successful tool usage (indicates clear intent)
      if (confidenceFactors.toolCallsCount > 0) {
        aiConfidenceScore += 0.05;
        console.log(`✅ Tools used successfully (${confidenceFactors.toolCallsCount}) - confidence boost`);
      }
    }
    
    // Clamp confidence between 0 and 1
    aiConfidenceScore = Math.max(0.0, Math.min(1.0, aiConfidenceScore));
    
    const confidence = aiConfidenceScore * 100; // Convert to percentage for legacy compatibility
    
    console.log(`📊 Final Confidence: ${aiConfidenceScore.toFixed(2)} (${confidence.toFixed(0)}%) | Factors:`, {
      sentiment: sentimentScore.toFixed(2),
      cartValue: `$${confidenceFactors.cartValue}`,
      violations: confidenceFactors.guardrailViolations,
      toolCalls: confidenceFactors.toolCallsCount,
      escalation: confidenceFactors.escalationMatch
    });
    
    // Mode Decision Logic
    // Manual: AI completely disabled (already handled above)
    // HITL: Requires approval when confidence < threshold
    // Auto (AI): Always auto-send, never require approval
    
    let requiresApproval = false;
    
    // HITL Mode: Require approval if confidence below threshold OR high negative sentiment
    if (mode === 'hitl') {
      requiresApproval = confidence < (confidenceThreshold * 100) || forceEscalation;
      const reason = forceEscalation 
        ? `high negative sentiment (${sentimentScore.toFixed(2)})`
        : `low confidence (${confidence}%)`;
      console.log(`🎯 HITL Mode: Approval ${requiresApproval ? 'REQUIRED' : 'NOT REQUIRED'} - ${reason}`);
    } else if (mode === 'auto') {
      // Auto mode: Force approval only for high negative sentiment
      requiresApproval = forceEscalation;
      if (forceEscalation) {
        console.log(`⚠️ AUTO Mode: Forcing approval due to high negative sentiment (${sentimentScore.toFixed(2)})`);
      } else {
        console.log(`🤖 AUTO Mode: Always auto-send (confidence: ${confidence}%)`);
      }
    }
    
    if (requiresApproval) {
      // Create pending approval
      const escalationReason = forceEscalation 
        ? `High negative sentiment detected (${sentimentScore.toFixed(2)})`
        : `Low confidence (${confidence}% < ${confidenceThreshold * 100}%)`;
      
      console.log(`⏸️  Creating pending approval: ${escalationReason}`);
      
      const { data: approval, error: approvalError } = await supabaseClient
        .from('ai_pending_approvals')
        .insert({
          conversation_id: conversationId,
          workspace_id: workspaceId,
          action_type: 'send_message',
          action_payload: { 
            type: 'send_message', 
            message: finalResponse,  // Changed from 'content' to 'message' to match UI
            message_type: 'text'
          },
          ai_reasoning: escalationReason,
          confidence_score: confidence / 100,
          status: 'pending'
        })
        .select()
        .single();
      
      if (approvalError) {
        console.error('❌ Failed to create approval:', approvalError);
        throw approvalError;
      }
      
      console.log('✅ Approval created:', approval.id);
      
      // Log the action (non-blocking)
      supabaseClient.from('ai_action_log').insert({
        conversation_id: conversationId,
        workspace_id: workspaceId,
        action_type: 'send_message',
        action_payload: { message: finalResponse },
        confidence_score: confidence / 100,
        mode: mode,
        execution_method: 'approval_required',
        result: 'pending_approval'
      }).then(({ error }) => {
        if (error) console.error('❌ Failed to log action:', error);
      });
      
      return new Response(JSON.stringify({ 
        requiresApproval: true,
        confidence,
        message: finalResponse,
        approvalId: approval.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } else {
      // Auto-send message (inline for performance)
      console.log('✅ Auto-sending (high confidence or auto mode)');
      
      const startSend = Date.now();
      
      // Get WhatsApp credentials and send directly (no extra function call)
      const whatsappAccount = conversation.whatsapp_accounts;
      if (!whatsappAccount?.access_token || !whatsappAccount?.phone_number_id) {
        console.error('❌ WhatsApp credentials missing');
        throw new Error('WhatsApp account not properly configured');
      }

      // Send via Meta Graph API directly
      const graphApiUrl = `https://graph.facebook.com/v18.0/${whatsappAccount.phone_number_id}/messages`;
      const graphResponse = await fetch(graphApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappAccount.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: conversation.customer_phone,
          type: 'text',
          text: { body: finalResponse }
        })
      });

      if (!graphResponse.ok) {
        const errorText = await graphResponse.text();
        console.error('❌ WhatsApp API error:', errorText);
        throw new Error(`WhatsApp send failed: ${graphResponse.status}`);
      }

      const graphData = await graphResponse.json();
      console.log(`✅ Message sent via WhatsApp API in ${Date.now() - startSend}ms`);

      // Store the outbound message
      await supabaseClient.from('messages').insert({
        conversation_id: conversationId,
        direction: 'outbound',
        from_number: whatsappAccount.phone_number,
        to_number: conversation.customer_phone,
        content: finalResponse,
        message_type: 'text',
        status: 'sent',
        whatsapp_message_id: graphData.messages?.[0]?.id,
        metadata: { ai_generated: true, confidence }
      });

      // Update conversation
      await supabaseClient
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: finalResponse.substring(0, 100)
        })
        .eq('id', conversationId);
      
      // Log the action (non-blocking)
      supabaseClient.from('ai_action_log').insert({
        conversation_id: conversationId,
        workspace_id: workspaceId,
        action_type: 'send_message',
        action_payload: { message: finalResponse },
        confidence_score: confidence / 100,
        mode: mode,
        execution_method: 'auto_send',
        result: 'success'
      }).then(({ error }) => {
        if (error) console.error('❌ Failed to log action:', error);
      });
      
      return new Response(JSON.stringify({ 
        success: true,
        confidence,
        requiresApproval: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in AI handler:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      response: "I'm having trouble processing that right now. Please try again or contact our support team." 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Tool execution functions
async function executeSearchProducts(supabase: any, workspaceId: string, args: any) {
  console.log('🔍 Executing exact_search_products with query:', args.query);
  
  // Use exact matching function for deterministic results
  const { data, error } = await supabase.rpc('exact_search_products', {
    workspace_uuid: workspaceId,
    search_query: args.query,
    category_filter: args.category || null,
    max_price_filter: args.max_price || null,
    result_limit: 5
  });

  if (error) {
    console.error('Search products error:', error);
    return { error: "Failed to search products", products: [] };
  }

  // Log match diagnostics for validation
  console.log('✅ Search results:', data?.map((p: any) => ({
    sku: p.sku,
    title: p.title,
    match_type: p.match_type,
    match_score: p.match_score
  })));

  return { products: data || [] };
}

async function executeAddToCart(supabase: any, conversationId: string, args: any) {
  // Fetch product details
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', args.product_id)
    .single();

  if (!product) {
    return { error: "Product not found" };
  }

  if (product.stock < (args.quantity || 1)) {
    return { error: "Insufficient stock", available: product.stock };
  }

  // Get current cart
  const { data: conversation } = await supabase
    .from('conversations')
    .select('cart_items, cart_total')
    .eq('id', conversationId)
    .single();

  const cartItems = conversation?.cart_items || [];
  const newItem = {
    product_id: product.id,
    title: product.title,
    price: product.price,
    quantity: args.quantity || 1,
    variant_info: args.variant_info || null,
    image_url: product.image_url,
    added_at: new Date().toISOString()
  };

  const updatedCart = [...cartItems, newItem];
  const newTotal = updatedCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Update conversation
  await supabase
    .from('conversations')
    .update({
      cart_items: updatedCart,
      cart_total: newTotal,
      last_interaction_type: 'shopping'
    })
    .eq('id', conversationId);

  return {
    success: true,
    cart_count: updatedCart.length,
    cart_total: newTotal,
    added_item: newItem
  };
}

async function executeViewCart(supabase: any, conversationId: string) {
  const { data: conversation } = await supabase
    .from('conversations')
    .select('cart_items, cart_total')
    .eq('id', conversationId)
    .single();

  return {
    items: conversation?.cart_items || [],
    total: conversation?.cart_total || 0,
    count: conversation?.cart_items?.length || 0
  };
}

async function executeRemoveFromCart(supabase: any, conversationId: string, args: any) {
  const { data: conversation } = await supabase
    .from('conversations')
    .select('cart_items')
    .eq('id', conversationId)
    .single();

  const cartItems = conversation?.cart_items || [];
  const updatedCart = cartItems.filter((item: any) => item.product_id !== args.product_id);
  const newTotal = updatedCart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

  await supabase
    .from('conversations')
    .update({
      cart_items: updatedCart,
      cart_total: newTotal
    })
    .eq('id', conversationId);

  return {
    success: true,
    cart_count: updatedCart.length,
    cart_total: newTotal
  };
}

async function executeCreateCheckout(supabase: any, conversation: any, workspace: any) {
  if (!conversation?.cart_items || conversation.cart_items.length === 0) {
    return { error: "Cart is empty" };
  }

  // Generate order number
  const { data: orderNumber } = await supabase.rpc('generate_order_number');

  // Create order
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      workspace_id: conversation.workspace_id,
      conversation_id: conversation.id,
      customer_phone: conversation.customer_phone,
      customer_name: conversation.customer_name,
      order_number: orderNumber,
      items: conversation.cart_items,
      subtotal: conversation.cart_total,
      total: conversation.cart_total,
      status: 'pending',
      payment_status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Create order error:', error);
    return { error: "Failed to create order" };
  }

  // TODO: Generate Stripe payment link
  const paymentLink = `https://pay.stripe.com/test-link-${order.id}`;

  // Update order with payment link
  await supabase
    .from('orders')
    .update({
      payment_link_url: paymentLink,
      payment_link_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
    .eq('id', order.id);

  // Clear cart
  await supabase
    .from('conversations')
    .update({
      cart_items: [],
      cart_total: 0,
      last_interaction_type: 'checkout'
    })
    .eq('id', conversation.id);

  return {
    success: true,
    order_number: orderNumber,
    payment_link: paymentLink,
    total: conversation.cart_total
  };
}

async function executeCheckOrderStatus(supabase: any, customerPhone: string, args: any) {
  let query = supabase
    .from('orders')
    .select('*')
    .eq('customer_phone', customerPhone)
    .order('created_at', { ascending: false });

  if (args.order_number) {
    query = query.eq('order_number', args.order_number);
  }

  const { data: orders } = await query.limit(1);

  if (!orders || orders.length === 0) {
    return { error: "No orders found" };
  }

  const order = orders[0];
  return {
    order_number: order.order_number,
    status: order.status,
    payment_status: order.payment_status,
    total: order.total,
    tracking_number: order.tracking_number || null,
    created_at: order.created_at
  };
}
