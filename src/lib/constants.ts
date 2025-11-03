/**
 * WhatsApp OAuth redirect URI
 * 
 * @deprecated This constant is no longer used for launching OAuth flows.
 * The redirect_uri is now provided by the backend (get-meta-config) as the
 * single source of truth to prevent mismatches.
 * 
 * This is kept only for backward compatibility in the callback page
 * when sending data to the backend. The backend ignores this value and
 * uses the stored redirect_uri from the oauth_states table instead.
 */
export const WHATSAPP_REDIRECT_URI = `${window.location.origin}/setup/whatsapp/callback`;
