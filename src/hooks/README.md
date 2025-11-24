# Hooks Overview and Recommendations

This document summarizes the responsibilities, usage expectations, and improvement opportunities for the hooks in `src/hooks`.

## `useIsMobile`
- **Purpose**: Detect whether the viewport is below the mobile breakpoint to drive responsive UI logic.
- **Parameters**: None.
- **Returns**: `boolean` indicating whether the viewport width is less than 768px.
- **Assumptions/Context**: Browser environment; safe default (`false`) during SSR.
- **Example**:
  ```tsx
  const isMobile = useIsMobile();
  return isMobile ? <MobileNav /> : <DesktopNav />;
  ```
- **Improvements/Notes**: SSR-safe initialization added. Consider exposing the breakpoint or accepting an override if multiple breakpoints are needed.

## `useMessageDeletion`
- **Purpose**: Soft-delete or restore messages and conversations while tracking in-flight state.
- **Parameters**: None; functions accept `messageIds` and `userId` arguments as needed.
- **Returns**: `{ softDeleteMessages, softDeleteConversation, restoreMessages, deletingMessages, deletingConversation }`.
- **Assumptions/Context**: Supabase RPC functions `soft_delete_messages`, `soft_delete_conversation`, and `restore_messages` exist; requires `useToast` provider.
- **Example**:
  ```tsx
  const { softDeleteMessages, deletingMessages } = useMessageDeletion();
  await softDeleteMessages([message.id], user.id);
  const isDeleting = deletingMessages.has(message.id);
  ```
- **Improvements/Notes**: Consider exposing error types from Supabase, and optionally accepting a logger so UI layers can display detailed failure reasons.

## `useToast`
- **Purpose**: Global toast store with helpers to enqueue, update, or dismiss notifications.
- **Parameters**: None; `toast` accepts `ToastProps` minus `id`.
- **Returns**: `{ toasts, toast, dismiss }` along with state-driven re-renders.
- **Assumptions/Context**: UI components subscribe via this hook; uses in-memory listeners, so it must run in a browser.
- **Example**:
  ```tsx
  const { toast } = useToast();
  toast({ title: "Saved", description: "Your changes are live." });
  ```
- **Improvements/Notes**: Listener subscription now occurs once to avoid redundant re-subscriptions. Consider moving side effects out of the reducer and tightening `ToastProps` generics.

## `useShopifyOAuth`
- **Purpose**: Normalize a shop domain and redirect to Shopify OAuth for a workspace.
- **Parameters**: None; `initiateOAuth(shopDomain: string)` performs the redirect.
- **Returns**: `{ initiateOAuth }`.
- **Assumptions/Context**: Requires `WorkspaceContext` and `VITE_SHOPIFY_CLIENT_ID`; relies on `window.location` for redirect.
- **Example**:
  ```tsx
  const { initiateOAuth } = useShopifyOAuth();
  initiateOAuth("brand-store");
  ```
- **Improvements/Notes**: Add validation/error surfacing to the caller, support custom redirect URIs for staging, and extract scope lists to config.

## `useWhatsAppOAuth`
- **Purpose**: Legacy Facebook SDK-based WhatsApp OAuth initiation.
- **Parameters**: None; `initiateOAuth()` triggers the FB login flow once the SDK is ready.
- **Returns**: `{ initiateOAuth, fbSdkReady }`.
- **Assumptions/Context**: Requires `WorkspaceContext`, Supabase edge function `get-meta-config`, and the Facebook SDK. Not currently used; prefer dedicated UI flow.
- **Example**:
  ```tsx
  const { initiateOAuth, fbSdkReady } = useWhatsAppOAuth();
  if (fbSdkReady) initiateOAuth();
  ```
- **Improvements/Notes**: Consider removing or migrating to a unified OAuth service module; ensure window-level FB references are guarded for SSR.

## `useWorkspaceConnections`
- **Purpose**: Fetch active catalog, payment, and WhatsApp connections for a workspace with lightweight caching.
- **Parameters**: `workspaceId: string | null`.
- **Returns**: React Query result object containing the connection payload.
- **Assumptions/Context**: Supabase tables `catalog_sources`, `payment_providers`, `whatsapp_accounts`, and `products` exist; relies on `localStorage` for caching.
- **Example**:
  ```tsx
  const { data, isLoading } = useWorkspaceConnections(workspaceId);
  const hasCatalog = !!data?.catalogSource;
  ```
- **Improvements/Notes**: Formalize types for each connection shape, lift cache helpers into a reusable storage utility, and consider server-driven caching headers.

---

## Structural Recommendations
- **Group by domain**: Move provider-specific OAuth hooks into a `src/hooks/integrations/` directory (e.g., `integrations/shopify`, `integrations/whatsapp`). Shared UI/UX hooks like `useIsMobile` and `useToast` can live under `src/hooks/ui/`.
- **Clarify naming**: Rename `use-mobile.tsx` to `useIsMobile.ts` for consistency with hook naming conventions. Similarly, place connection-related hooks under `src/hooks/workspace/` to distinguish business logic from UI utilities.
- **Shared contracts**: Create a `src/hooks/types.ts` to share interfaces (e.g., workspace connection shapes) across hooks and consuming components, reducing `any` usage and duplication.
- **Documentation discoverability**: Keep this README updated and link to it from developer onboarding docs so teams know where reusable hooks live and how to use them.
