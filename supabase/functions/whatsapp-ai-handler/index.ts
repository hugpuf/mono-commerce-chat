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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { conversationId, customerMessage, workspaceId } = await req.json();

    console.log('🤖 AI Handler - Processing message:', { conversationId, workspaceId });

    // Fetch AI settings for workspace
    const { data: aiSettings } = await supabaseClient
      .from('workspace_ai_settings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    const mode = aiSettings?.mode || 'manual';
    const confidenceThreshold = aiSettings?.confidence_threshold || 0.7;

    console.log('🔧 AI Settings:', { mode, confidenceThreshold });

    // Fetch conversation history
    const { data: messages } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20); // Last 20 messages for context

    // Fetch conversation (for cart state)
    const { data: conversation } = await supabaseClient
      .from('conversations')
      .select('*, whatsapp_accounts(*)')
      .eq('id', conversationId)
      .single();

    // Fetch workspace info
    const { data: workspace } = await supabaseClient
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

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

    // Build system prompt from settings
    const systemPromptParts = [
      `You are a helpful shopping assistant for ${workspace?.company_name || workspace?.name}.`,
      aiSettings?.ai_voice ? `Brand Voice: ${aiSettings.ai_voice}` : '',
      aiSettings?.dos ? `Do: ${aiSettings.dos}` : '',
      aiSettings?.donts ? `Don't: ${aiSettings.donts}` : '',
      aiSettings?.escalation_rules ? `Escalate when: ${aiSettings.escalation_rules}` : '',
      aiSettings?.compliance_notes ? `Compliance: ${aiSettings.compliance_notes}` : '',
      `
Your role:
- Help customers find products
- Answer questions about products, prices, and availability
- Guide customers through the buying process
- Provide order status updates

Current cart: ${conversation?.cart_items?.length || 0} items, Total: $${Number(conversation?.cart_total || 0).toFixed(2)}

Guidelines:
- Be friendly, concise, and helpful
- When showing products, mention key details: name, price, stock status
- Always confirm before adding items to cart
- Guide customers naturally toward checkout when appropriate
- If a product is out of stock, suggest alternatives
- Use emojis occasionally to be friendly: 🛍️ 📦 ✨

Remember: You can search products, manage cart, create checkout links, and check orders.
      `.trim()
    ].filter(Boolean).join('\n\n');

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
          { role: "system", content: systemPromptParts },
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
              { role: "system", content: systemPromptParts },
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

    return new Response(JSON.stringify({ 
      response: finalResponse,
      tool_calls_executed: toolCalls?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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
