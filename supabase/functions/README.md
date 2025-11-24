# Supabase Edge Functions

This directory contains the Supabase Edge Functions that power Shopify, WhatsApp, AI, and data-governance workflows. Each subfolder corresponds to a single deployed function unless noted otherwise.

## Directory overview

- `approve-ai-action/` – Human-in-the-loop approval handler that executes AI-suggested actions (e.g., outbound WhatsApp replies or cart updates) after reviewer approval.
- `cancel-sync/` – Endpoint to mark an in-progress catalog sync as cancelled.
- `delete-workspace-data/` – Orchestrates workspace-level data deletion (full or scoped) and audit logging.
- `get-meta-config/` – Lightweight helper returning Meta (Facebook) app identifiers to clients.
- `meta-data-deletion-callback/` – Receives Meta data-deletion webhooks and enqueues workspace deletion requests.
- `send-whatsapp-message/` – Sends WhatsApp messages via Meta Graph API on behalf of a workspace.
- `shopify-adjust-inventory/` – Adjusts Shopify product inventory for a location.
- `shopify-bulk-import/` – Imports Shopify products in bulk and records catalog sources.
- `shopify-oauth/` – Initiates the Shopify OAuth handshake and persists state.
- `shopify-webhook/` – Processes Shopify webhooks (orders, products, app uninstall, etc.).
- `start-whatsapp-oauth/` – Starts the WhatsApp onboarding OAuth flow and stores verification state.
- `sync-to-whatsapp/` – Kicks off product sync from the catalog to WhatsApp templates/messages.
- `whatsapp-ai-handler/` – AI responder for WhatsApp conversations plus guardrails and tool definitions.
- `whatsapp-manual-setup/` – Endpoint for manual WhatsApp setup data (business information, numbers).
- `whatsapp-oauth-callback/` – Completes WhatsApp OAuth, exchanges codes for tokens, and stores connection details.
- `whatsapp-webhook/` – Webhook for WhatsApp message and status events with verification handling.

## Function details

### approve-ai-action
- **Purpose:** Handle HITL approvals for AI-suggested actions and execute the action (sending WhatsApp messages or updating carts) with latency optimizations.
- **Inputs:** JSON body `{ approvalId, approved, rejectionReason?, optimisticMessageId? }` with `Authorization` header for the user session.
- **Outputs:** JSON `{ success: true, optimisticMessageId }` on approval, or `{ success: true, rejected: true }` on rejection.
- **Side effects & dependencies:** Reads `ai_pending_approvals` and related `conversations`; writes to `messages`, `conversations`, `ai_action_log`; calls Meta Graph API directly when sending messages.

### cancel-sync
- **Purpose:** Mark a catalog source sync as cancelled.
- **Inputs:** JSON body `{ catalogSourceId }`.
- **Outputs:** JSON `{ success: true, message: 'Sync cancelled' }` when the status update succeeds.
- **Side effects & dependencies:** Updates `catalog_sources.sync_status` and timestamps.

### delete-workspace-data
- **Purpose:** Authenticated endpoint to request selective or full workspace deletion and perform the corresponding data purge.
- **Inputs:** JSON body `{ workspaceId, deletionType: 'selective' | 'full', deletionScope: string[] }` with bearer token for user validation.
- **Outputs:** JSON `{ success: true, deletionRequestId, confirmationCode }` on success; error payload otherwise.
- **Side effects & dependencies:** Validates the user via `user_profiles`, writes to `data_deletion_requests`, deletes rows across scoped tables or the full deletion order, removes storage assets, soft-deletes the workspace, and logs via `log_audit_event` RPC.

### get-meta-config
- **Purpose:** Return Meta app and configuration IDs for client initialization.
- **Inputs:** None beyond CORS preflight; reads environment `META_APP_ID` and `META_CONFIG_ID`.
- **Outputs:** JSON `{ appId, configId }` or error when env vars are missing.
- **Side effects & dependencies:** None beyond environment access.

### meta-data-deletion-callback
- **Purpose:** Meta webhook handler for data deletion requests; verifies signed_request signatures, creates deletion requests, and triggers `delete-workspace-data` asynchronously.
- **Inputs:** `signed_request` form-data parameter from Meta callback.
- **Outputs:** JSON `{ url, confirmation_code }` (always 200 to satisfy Meta retries).
- **Side effects & dependencies:** Validates HMAC with `META_APP_SECRET`, inserts into `data_deletion_requests`, optionally fetches workspace from `whatsapp_accounts`, and triggers `delete-workspace-data` via service key.

### send-whatsapp-message
- **Purpose:** Send a WhatsApp text template or freeform message for a workspace.
- **Inputs:** JSON payload with target number, message template or body, and workspace context (see code for shape).
- **Outputs:** JSON `{ success: true, messageId }` or error payload.
- **Side effects & dependencies:** Fetches WhatsApp account credentials, calls Meta Graph API, and writes message records to `messages` and `conversations` as applicable.

### shopify-adjust-inventory
- **Purpose:** Apply incremental inventory adjustments to a Shopify product/location pair.
- **Inputs:** JSON body with Shopify shop domain, access token, product/variant IDs, location ID, and adjustment quantity.
- **Outputs:** JSON `{ success: true, newQuantity }` or error payload.
- **Side effects & dependencies:** Calls Shopify Admin API inventory endpoints; may log errors.

### shopify-bulk-import
- **Purpose:** Perform a bulk product import from Shopify, creating catalog source entries and fetching paginated product data.
- **Inputs:** JSON payload containing Shopify shop data, access token, and workspace context.
- **Outputs:** JSON `{ success: true, totalImported }` on success.
- **Side effects & dependencies:** Uses Shopify GraphQL APIs, inserts products, locations, and catalog sources into Supabase tables.

### shopify-oauth
- **Purpose:** Generate Shopify OAuth authorization URLs and persist OAuth state for later validation.
- **Inputs:** JSON `{ shop, workspace_id, redirect_uri }`.
- **Outputs:** JSON `{ authUrl, state }`.
- **Side effects & dependencies:** Inserts OAuth state into `oauth_states` with expiry; relies on environment Shopify app keys.

### shopify-webhook
- **Purpose:** Process Shopify webhook events (orders, products, app uninstalled, etc.).
- **Inputs:** Raw webhook body with HMAC headers from Shopify; GET requests may be used for health checks.
- **Outputs:** Usually `{ received: true }` after processing.
- **Side effects & dependencies:** Validates HMAC using Shopify secret, updates orders/products, records uninstall events, and may trigger downstream sync updates.

### start-whatsapp-oauth
- **Purpose:** Initialize WhatsApp OAuth by generating state and verify tokens plus storing preliminary setup metadata.
- **Inputs:** JSON body `{ workspace_id, business_name, phone_number, timezone, ... }`.
- **Outputs:** JSON `{ success: true, state, verify_token }`.
- **Side effects & dependencies:** Writes OAuth state rows and phone verification tokens into `oauth_states` and related tables.

### sync-to-whatsapp
- **Purpose:** Kick off catalog sync to WhatsApp by enqueueing products/messages for delivery.
- **Inputs:** JSON payload specifying workspace/catalog source identifiers.
- **Outputs:** JSON `{ success: true, syncId }` when enqueued.
- **Side effects & dependencies:** Interacts with catalog tables and WhatsApp messaging/template endpoints.

### whatsapp-ai-handler
- **Purpose:** AI responder that pulls conversation context, applies guardrails (quiet hours, compliance, escalation), and returns AI-generated guidance or tool calls.
- **Inputs:** JSON `{ conversationId, customerMessage, workspaceId }`.
- **Outputs:** JSON containing AI message/tool call response with guardrail indicators (quiet hours, manual mode, queued status).
- **Side effects & dependencies:** Reads `workspace_ai_settings`, `messages`, `conversations`, `workspaces`, `products`; uses helper utilities for sentiment/compliance; may call third-party AI provider (via fetch) and logs decisions.

### whatsapp-manual-setup
- **Purpose:** Manual setup endpoint for WhatsApp accounts when automated OAuth is not used.
- **Inputs:** JSON payload including business profile, phone details, and workspace identifiers.
- **Outputs:** JSON `{ success: true, accountId }` or error payload.
- **Side effects & dependencies:** Inserts or updates `whatsapp_accounts`, may fetch phone details from Meta Graph API using provided tokens.

### whatsapp-oauth-callback
- **Purpose:** Complete WhatsApp OAuth by validating state, exchanging the code for access tokens, verifying the business phone, and persisting connection data.
- **Inputs:** JSON `{ code, workspace_id, state, setup_data }` from the frontend.
- **Outputs:** JSON `{ success: true, account_id, phone_number_id, ... }` or structured error with stage metadata.
- **Side effects & dependencies:** Reads `oauth_states`, fetches Meta app credentials, calls Meta Graph API to exchange tokens and verify phone numbers, updates `whatsapp_accounts`, `workspaces`, and related tables.

### whatsapp-webhook
- **Purpose:** Webhook endpoint for WhatsApp message/status events with token verification support.
- **Inputs:** GET with `hub.*` params for verification; POST with WhatsApp webhook payloads.
- **Outputs:** `challenge` echo on verification; `{ received: true }` or `{ ignored: true }` for POST.
- **Side effects & dependencies:** Verifies tokens against `whatsapp_accounts`, logs webhook events, upserts conversations/messages, and can trigger AI handling or delivery receipts.

## Structural improvements (proposed)

- Group functions by domain to reduce top-level clutter and surface shared utilities. Suggested layout:
  - `functions/shopify/` containing OAuth, webhook, bulk-import, and inventory adjustments.
  - `functions/whatsapp/` containing OAuth start/callback, webhook, manual-setup, send-message, AI handler, and sync-to-whatsapp.
  - `functions/compliance/` containing delete-workspace-data and meta-data-deletion-callback.
  - `functions/operations/` containing approve-ai-action and cancel-sync.
- Extract common helpers (CORS headers, Supabase client creation, error formatter) into shared modules imported via relative paths or a small utility package to remove duplication across functions.

## Code-level recommendations

- **Centralize Supabase client creation:** Many functions duplicate `createClient` calls with env lookups. A shared helper that enforces required env vars and headers would reduce repetition and configuration drift.
- **Standardize CORS and error responses:** Every function recreates `corsHeaders` and ad-hoc error payloads. A shared response utility would simplify logic and ensure consistent status codes and observability metadata.
- **Stronger input validation:** Several endpoints trust `await req.json()` without schema checks (e.g., `cancel-sync`, `send-whatsapp-message`, `shopify-*`). Introduce lightweight validation (zod/Valibot) to fail fast and produce actionable error messages.
- **Retry/backoff around external APIs:** Functions calling Meta or Shopify APIs should wrap fetches with retry logic for transient failures and log correlation IDs for observability.
- **Background task patterns:** Long-running operations (`delete-workspace-data`, Shopify imports) could enqueue work to Supabase Queues or a task table instead of running entirely in-request to avoid timeouts and allow progress tracking.
- **Security hardening:** Normalize authentication by requiring bearer tokens where appropriate (some service-role calls bypass auth), and avoid exposing service role keys to client-triggered paths; consider RLS-backed RPCs when feasible.
- **Logging consistency:** Adopt structured logging (JSON with request IDs/workspace IDs) to aid debugging across functions; sanitize payloads to avoid leaking secrets.
- **Testability and typing:** Extract business logic into testable modules with explicit TypeScript types/interfaces instead of inline `any` usage (e.g., deletion scopes). This will improve maintainability and onboarding.
- **Timeout and cancellation handling:** For webhook handlers, short-circuit early on unsupported events and enforce timeouts when calling third parties to keep responses under platform limits.

