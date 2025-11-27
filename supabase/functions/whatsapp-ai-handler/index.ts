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

// Declare EdgeRuntime for Deno Deploy
declare const EdgeRuntime: {
  waitUntil(promise: Promise<any>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const toolFunctionMap: Record<string, string> = {
  search_products: 'search-products',
  add_to_cart: 'add-to-cart',
  view_cart: 'view-cart',
  remove_from_cart: 'remove-from-cart',
  create_checkout: 'create-checkout',
  check_order_status: 'check-order-status',
  browse_catalog: 'browse-catalog'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let conversationId: string | undefined;
  let instanceId: string | undefined;

  try {
    const startTime = Date.now(); // Track processing start time
    const executedToolCalls: Array<{ name: string; args: any; result: any }> = []; // Track tool executions
    
    const requestBody = await req.json();
    conversationId = requestBody.conversationId;
    instanceId = requestBody.instanceId;
    const workspaceId = requestBody.workspaceId;
    const whatsappMessageId = requestBody.whatsappMessageId;

    if (!conversationId || !instanceId || !workspaceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🤖 AI Handler - Processing conversation:', { conversationId, workspaceId, instanceId });

    // Fetch buffered messages
    const { data: currentConv, error: convError } = await supabaseClient
      .from('conversations')
      .select('message_buffer, lock_acquired_by')
      .eq('id', conversationId)
      .single();

    if (convError || !currentConv) {
      console.error('❌ Failed to fetch conversation:', convError);
      throw new Error('Conversation not found');
    }

    // Verify lock ownership
    if (currentConv.lock_acquired_by !== instanceId) {
      console.error('❌ Lock ownership mismatch!', { 
        expected: instanceId, 
        actual: currentConv.lock_acquired_by 
      });
      return new Response(
        JSON.stringify({ error: 'Lock ownership mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Combine buffered messages
    const bufferedMessages = currentConv.message_buffer || [];
    let customerMessage = bufferedMessages.join('\n');
    
    console.log(`📦 Processing ${bufferedMessages.length} buffered message(s)`);
    console.log('💬 Combined message:', customerMessage);

    // Placeholder tracking
    const PLACEHOLDER_DELAYS = [3000, 8000]; // 3s and 8s
    const MIN_DELAY_AFTER_PLACEHOLDER = 1000; // 1s minimum
    let placeholdersSent = 0;
    let lastPlaceholderTime = 0;
    const placeholderTimers: number[] = [];

    // Helper: Send WhatsApp message
    const sendWhatsAppMessage = async (content: string) => {
      const { data: whatsappAccount } = await supabaseClient
        .from('whatsapp_accounts')
        .select('access_token, phone_number_id, phone_number')
        .eq('workspace_id', workspaceId)
        .single();

      if (!whatsappAccount?.access_token || !whatsappAccount?.phone_number_id) {
        console.error('❌ WhatsApp credentials missing for placeholder');
        return false;
      }

      const { data: conv } = await supabaseClient
        .from('conversations')
        .select('customer_phone')
        .eq('id', conversationId)
        .single();

      if (!conv) return false;

      const graphApiUrl = `https://graph.facebook.com/v18.0/${whatsappAccount.phone_number_id}/messages`;
      const response = await fetch(graphApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappAccount.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: conv.customer_phone,
          type: 'text',
          text: { body: content }
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Store placeholder message
        await supabaseClient.from('messages').insert({
          conversation_id: conversationId,
          direction: 'outbound',
          from_number: whatsappAccount.phone_number,
          to_number: conv.customer_phone,
          content: content,
          message_type: 'text',
          status: 'sent',
          whatsapp_message_id: data.messages?.[0]?.id,
          metadata: { placeholder: true }
        });
        return true;
      }
      return false;
    };

    // Helper: Cancel all pending placeholder timers
    const cancelPlaceholders = () => {
      placeholderTimers.forEach(timer => clearTimeout(timer));
      placeholderTimers.length = 0;
    };

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

    // Setup smart placeholder system (max 2 messages)
    console.log('⏱️ Setting up placeholder timers...');
    const placeholderMessages = mode === 'hitl' 
      ? ['Reviewing your message...', 'Our team will review and respond shortly...']
      : ['One moment, checking that for you...', 'Still working on this...'];

    PLACEHOLDER_DELAYS.forEach((delay, index) => {
      if (index < 2) { // Max 2 placeholders
        const timer = setTimeout(async () => {
          if (placeholdersSent < 2) {
            console.log(`⏱️ Sending placeholder ${placeholdersSent + 1}/2 at ${delay}ms`);
            const sent = await sendWhatsAppMessage(placeholderMessages[index]);
            if (sent) {
              placeholdersSent++;
              lastPlaceholderTime = Date.now();
            }
          }
        }, delay);
        placeholderTimers.push(timer);
      }
    });

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
          description: "Search the product catalog by name, category, keywords, or description. Use tag-based searches for broad queries (e.g., 'footwear', 'sneakers').",
          parameters: {
            type: "object",
            properties: {
              query: { 
                type: "string", 
                description: "What to search for (product name, SKU, category, tag, or description)" 
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
          name: "browse_catalog",
          description: "Show a sample of available products when customer wants to browse generally. Use when they ask 'what do you have', 'show me products', or when search returns no results.",
          parameters: {
            type: "object",
            properties: {
              limit: {
                type: "number",
                description: "Number of products to show (default 5)",
                default: 5
              }
            }
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

    const invokeTool = async (toolName: string, toolArgs: any) => {
      const functionName = toolFunctionMap[toolName];
      if (!functionName) {
        console.warn(`⚠️ Unknown tool requested: ${toolName}`);
        return { error: "Unknown tool" };
      }

      const { data, error } = await supabaseClient.functions.invoke(functionName, {
        body: {
          ...toolArgs,
          workspaceId,
          conversationId
        }
      });

      if (error) {
        console.error(`❌ Tool invocation failed for ${toolName}:`, error);
        return { error: error.message || 'Tool invocation failed' };
      }

      return data;
    };

    // Execute tool calls
    if (toolCalls && toolCalls.length > 0) {
      console.log('🔧 Tool calls detected:', toolCalls.length);
      
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        console.log(`🔧 Executing tool: ${toolName}`, toolArgs);

        // Send contextual placeholder for tool execution (if < 2 sent already)
        if (placeholdersSent < 2) {
          const contextualMessages: Record<string, string> = {
            search_products: 'Searching our products for you...',
            browse_catalog: 'Browsing our catalog...',
            add_to_cart: 'Adding that to your cart...',
            create_checkout: 'Preparing your checkout link...',
            check_order_status: 'Looking up your order...'
          };
          
          const contextualMsg = contextualMessages[toolName];
          if (contextualMsg) {
            console.log(`🔧 Sending contextual placeholder for ${toolName}`);
            cancelPlaceholders(); // Cancel generic placeholders
            const sent = await sendWhatsAppMessage(contextualMsg);
            if (sent) {
              placeholdersSent++;
              lastPlaceholderTime = Date.now();
            }
          }
        }

        const toolResult = await invokeTool(toolName, toolArgs);

        console.log(`✅ Tool result for ${toolName}:`, toolResult);
        
        // Track tool execution for evaluation
        executedToolCalls.push({ name: toolName, args: toolArgs, result: toolResult });

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

    // === BUFFER RE-CHECK LOOP: Ensure we answer most recent question ===
    console.log('🔄 Checking for new messages that arrived during processing...');
    
    const MAX_PROCESSING_LOOPS = 5;
    let processingLoop = 0;
    let processedMessageCount = bufferedMessages.length;
    let currentResponse = finalResponse;
    let currentToolCalls = toolCalls;
    
    // eslint-disable-next-line no-constant-condition
    while (true) {
      processingLoop++;
      
      if (processingLoop > MAX_PROCESSING_LOOPS) {
        console.warn('⚠️ Max processing loops reached - proceeding with current response');
        break;
      }
      
      // Re-fetch current buffer state
      const { data: latestConv } = await supabaseClient
        .from('conversations')
        .select('message_buffer')
        .eq('id', conversationId)
        .single();
      
      const latestBuffer = latestConv?.message_buffer || [];
      
      // Check if new messages arrived
      if (latestBuffer.length > processedMessageCount) {
        const newMessages = latestBuffer.slice(processedMessageCount);
        console.log(`📨 ${newMessages.length} new message(s) arrived during processing loop ${processingLoop}`);
        console.log('💬 New messages:', newMessages);
        
        // Add small debounce to catch rapid follow-ups
        console.log('⏱️ Adding 1s debounce to catch additional rapid messages...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Re-check one more time after debounce
        const { data: finalConv } = await supabaseClient
          .from('conversations')
          .select('message_buffer')
          .eq('id', conversationId)
          .single();
        
        const finalBuffer = finalConv?.message_buffer || [];
        const allNewMessages = finalBuffer.slice(processedMessageCount);
        
        console.log(`📨 Total new messages after debounce: ${allNewMessages.length}`);
        
        // Combine all new messages
        const combinedNewMessage = allNewMessages.join('\n');
        
        // Update customerMessage to the most recent for sentiment analysis
        customerMessage = combinedNewMessage;
        
        // Update conversation history with the previous AI response
        conversationHistory.push(
          { role: 'user', content: customerMessage },
          { role: 'assistant', content: currentResponse }
        );
        
        // Re-call AI with updated context
        console.log('🤖 Re-calling AI with updated context...');
        const reprocessResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              { role: "user", content: combinedNewMessage }
            ],
            tools: tools,
            tool_choice: "auto"
          })
        });
        
        if (!reprocessResponse.ok) {
          console.error('❌ Re-processing AI call failed - using previous response');
          break;
        }
        
        const reprocessData = await reprocessResponse.json();
        currentResponse = reprocessData.choices[0].message.content || "";
        currentToolCalls = reprocessData.choices[0].message.tool_calls;
        
        // Execute any new tool calls
        if (currentToolCalls && currentToolCalls.length > 0) {
          console.log('🔧 Re-processing tool calls:', currentToolCalls.length);
          
          for (const toolCall of currentToolCalls) {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments);
            console.log(`🔧 Executing tool: ${toolName}`, toolArgs);
            
            const toolResult = await invokeTool(toolName, toolArgs);
            
            // Get natural language response for tool result
            const toolFollowUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                  { role: "user", content: combinedNewMessage },
                  reprocessData.choices[0].message,
                  {
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(toolResult)
                  }
                ]
              })
            });
            
            const toolFollowUpData = await toolFollowUpResponse.json();
            currentResponse = toolFollowUpData.choices[0].message.content;
          }
        }
        
        // Update processed count and continue loop
        processedMessageCount = finalBuffer.length;
        finalResponse = currentResponse;
        
      } else {
        // No new messages - we're done
        console.log('✅ No new messages arrived - proceeding with current response');
        break;
      }
    }
    
    console.log(`🔄 Processing loop completed after ${processingLoop} iteration(s)`);
    
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
    
    // Cancel any remaining placeholder timers
    cancelPlaceholders();
    
    // Enforce minimum delay after placeholder
    if (placeholdersSent > 0 && lastPlaceholderTime > 0) {
      const timeSinceLastPlaceholder = Date.now() - lastPlaceholderTime;
      if (timeSinceLastPlaceholder < MIN_DELAY_AFTER_PLACEHOLDER) {
        const remainingDelay = MIN_DELAY_AFTER_PLACEHOLDER - timeSinceLastPlaceholder;
        console.log(`⏱️ Waiting ${remainingDelay}ms after placeholder before final response`);
        await new Promise(resolve => setTimeout(resolve, remainingDelay));
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
      
      // === FIRE-AND-FORGET EVALUATION LOG (HITL MODE) ===
      const processingTime = Date.now() - startTime;
      const evaluationWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
      
      if (evaluationWebhookUrl) {
        console.log('📊 Sending HITL evaluation payload to n8n (fire-and-forget)');
        
        // Build comprehensive evaluation payload for HITL mode
        const evaluationPayload = {
          conversationId,
          workspaceId,
          approvalId: approval.id,
          input: {
            customerMessage,
            bufferSize: bufferedMessages.length,
            messageType: 'text'
          },
          context: {
            conversationHistory: conversationHistory.map(m => ({
              role: m.role,
              content: m.content
            })),
            aiMode: mode,
            productCount: productCount,
            settings: {
              aiVoice: aiSettings?.ai_voice,
              confidenceThreshold: aiSettings?.confidence_threshold
            }
          },
          output: {
            finalAnswer: finalResponse,
            confidence: confidence / 100,
            toolCalls: executedToolCalls,
            processingTime,
            requiresApproval: true,
            escalationReason
          },
          evaluation: {
            sentiment: sentimentScore,
            guardrailViolations: guardrailViolations?.map(v => v.ruleName) || [],
            escalationMatches: escalationMatch ? [escalationMatch.policyName] : [],
            complianceResults: complianceResult
          },
          timestamp: new Date().toISOString()
        };
        
        // Fire-and-forget: use EdgeRuntime.waitUntil for reliable execution
        EdgeRuntime.waitUntil(
          (async () => {
            try {
              const evalResponse = await fetch(evaluationWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(evaluationPayload)
              });
              
              if (!evalResponse.ok) {
                console.error('⚠️ HITL evaluation webhook failed:', evalResponse.status);
              } else {
                console.log('✅ HITL evaluation payload sent successfully');
              }
            } catch (err) {
              console.error('⚠️ HITL evaluation webhook error (non-blocking):', err);
            }
          })()
        );
      }
      
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
      
      // === FIRE-AND-FORGET EVALUATION LOG ===
      const processingTime = Date.now() - startTime;
      const evaluationWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
      
      if (evaluationWebhookUrl) {
        console.log('📊 Sending evaluation payload to n8n (fire-and-forget)');
        
        // Build comprehensive evaluation payload
        const evaluationPayload = {
          conversationId,
          workspaceId,
          input: {
            customerMessage,
            bufferSize: bufferedMessages.length,
            messageType: 'text'
          },
          context: {
            conversationHistory: conversationHistory.map(m => ({
              role: m.role,
              content: m.content
            })),
            aiMode: mode,
            productCount: productCount,
            settings: {
              aiVoice: aiSettings?.ai_voice,
              confidenceThreshold: aiSettings?.confidence_threshold
            }
          },
          output: {
            finalAnswer: finalResponse,
            confidence: confidence / 100,
            toolCalls: executedToolCalls,
            processingTime
          },
          evaluation: {
            sentiment: sentimentScore,
            guardrailViolations: guardrailViolations?.map(v => v.ruleName) || [],
            escalationMatches: escalationMatch ? [escalationMatch.policyName] : [],
            complianceResults: complianceResult
          },
          timestamp: new Date().toISOString()
        };
        
        // Fire-and-forget: use EdgeRuntime.waitUntil for reliable execution
        EdgeRuntime.waitUntil(
          (async () => {
            try {
              const evalResponse = await fetch(evaluationWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(evaluationPayload)
              });
              
              if (!evalResponse.ok) {
                console.error('⚠️ Evaluation webhook failed:', evalResponse.status);
              } else {
                console.log('✅ Evaluation payload sent successfully');
              }
            } catch (err) {
              console.error('⚠️ Evaluation webhook error (non-blocking):', err);
            }
          })()
        );
      }
      
      return new Response(JSON.stringify({ 
        success: true,
        confidence,
        requiresApproval: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('❌ Error in AI handler:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      response: "I'm having trouble processing that right now. Please try again or contact our support team." 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } finally {
    // ALWAYS release the lock, even on error
    if (conversationId && instanceId) {
      try {
        console.log('🔓 Releasing conversation lock...', { conversationId, instanceId });
        
        const { data: released, error: unlockError } = await supabaseClient.rpc('release_conversation_lock', {
          p_conversation_id: conversationId,
          p_instance_id: instanceId
        });

        if (unlockError) {
          console.error('❌ Failed to release lock:', unlockError);
        } else if (released) {
          console.log('✅ Lock released successfully');
        } else {
          console.warn('⚠️ Lock release returned false (ownership mismatch?)');
        }
      } catch (unlockErr) {
        console.error('❌ Exception during lock release:', unlockErr);
      }
    }
  }
});

