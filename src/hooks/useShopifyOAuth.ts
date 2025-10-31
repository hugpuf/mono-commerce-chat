import { useWorkspace } from "@/contexts/WorkspaceContext";

interface ShopifyOAuthParams {
  shopDomain: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

export function useShopifyOAuth() {
  const { workspaceId } = useWorkspace();

  const initiateOAuth = (shopDomain: string) => {
    if (!workspaceId) {
      console.error("No workspace ID found");
      return;
    }

    // Get the client ID from environment
    const clientId = import.meta.env.VITE_SHOPIFY_CLIENT_ID;
    
    if (!clientId) {
      console.error("SHOPIFY_CLIENT_ID not configured");
      return;
    }

    // Construct redirect URI based on current origin
    const redirectUri = `${window.location.origin}/setup/shopify/callback`;

    // Required scopes for product catalog integration
    const scopes = [
      "read_products",
      "write_products",
      "read_inventory",
      "write_inventory"
    ];

    // Generate state parameter (workspace ID for CSRF protection)
    const state = workspaceId;

    // Build OAuth authorization URL
    const authUrl = buildAuthorizationUrl({
      shopDomain,
      clientId,
      redirectUri,
      scopes,
    }, state);

    // Redirect to Shopify OAuth page
    window.location.href = authUrl;
  };

  return { initiateOAuth };
}

function buildAuthorizationUrl(
  params: ShopifyOAuthParams,
  state: string
): string {
  const { shopDomain, clientId, redirectUri, scopes } = params;

  const url = new URL(`https://${shopDomain}/admin/oauth/authorize`);
  url.searchParams.append("client_id", clientId);
  url.searchParams.append("scope", scopes.join(","));
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("state", state);

  return url.toString();
}
