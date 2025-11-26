# Supabase Edge Function Modularity Guide

This guide summarizes best practices for organizing Supabase Edge Functions when using AI tool calls. It highlights the current monolithic implementation in `whatsapp-ai-handler` and provides a modular pattern that separates each tool into its own function for clarity, security, and maintainability.

## Current state: tools embedded in `whatsapp-ai-handler`

The `whatsapp-ai-handler` currently executes tool logic directly in the main handler via a switch statement. Each case calls database RPCs or performs business logic inline, coupling WhatsApp orchestration with product search, cart updates, and checkout flows. This makes the handler harder to maintain and test, and increases the blast radius of future changes.

Key example (simplified):
- The handler parses tool calls from the AI response and executes tool-specific helpers like `executeSearchProducts`, `executeAddToCart`, `executeRemoveFromCart`, and `executeCreateCheckout` inside the main request lifecycle.
- Tool execution is interleaved with placeholder messaging, confidence scoring, and retry loops, which obscures responsibility boundaries.

## When to split functions

Create dedicated Edge Functions for each tool when:
- **Security contexts differ** (e.g., service-role key usage or heightened logging needs) and you want least-privilege per function.
- **Change velocity diverges** between tools (product search vs. checkout) and you want to deploy independently without touching the AI orchestrator.
- **Resource profiles differ** (CPU/IO-heavy search vs. lightweight cart lookups) and you want clearer performance isolation and observability.
- **Testing or ownership** is clearer when each tool has its own entry point and surface for contract tests.

## Recommended architecture

1. **One function per tool** under `supabase/functions/<tool-name>/index.ts`:
   - `search-products` – calls `exact_search_products` RPC.
   - `add-to-cart` – writes to cart tables and returns the cart state.
   - `remove-from-cart` – removes line items and returns the updated cart.
   - `create-checkout` – generates checkout URLs/records.
   - (Optional) `view-cart`, `check-order-status`, `browse-catalog` to fully decouple.

2. **Shared utility module** (e.g., `supabase/functions/_shared/supabase-client.ts`):
   - Centralize `createClient` with strict env validation.
   - Provide common CORS headers and error helpers.

3. **AI orchestrator remains thin**:
   - `whatsapp-ai-handler` only parses tool calls and invokes `supabase.functions.invoke(toolName)` with a consistent payload shape.
   - Tool outputs flow back into the LLM as observations.

## Implementation steps

1. **Create function folders**: `supabase/functions/search-products`, `add-to-cart`, `remove-from-cart`, `create-checkout` (and others as needed).
2. **Move logic**: Extract the existing helper for each tool into its function’s `index.ts`, handling input validation and supabase client creation inside the tool.
3. **Standardize payloads**: Accept `{ workspaceId, conversationId, ...toolArgs }` per function to keep the orchestrator generic.
4. **Update `whatsapp-ai-handler`**: Replace the switch statement with `supabase.functions.invoke(toolName, { body: {...} })`, passing the tool parameters and workspace context.
5. **Deploy independently**: Deploy tool functions individually, then deploy `whatsapp-ai-handler`.

## Benefits

- **Maintainability**: Smaller, focused functions reduce cognitive load and make code reviews easier.
- **Security**: Scope service-role access to the minimum needed per tool; avoid exposing broad privileges in the orchestrator.
- **Reliability**: Fault isolation—failures in one tool do not take down the AI handler; retries and timeouts can be tuned per tool.
- **Testability**: Each tool has a single responsibility and can be contract-tested without WhatsApp plumbing.
- **Extensibility**: Add new tools by creating new functions without editing the AI orchestrator.

## Validation checklist

- [ ] Each tool function validates required parameters and returns structured errors.
- [ ] Shared client utility enforces presence of `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Orchestrator passes `workspaceId` and `conversationId` to every tool call.
- [ ] Tool names in AI prompts match deployed function names.
- [ ] Independent deploy commands succeed for each function and the orchestrator.

