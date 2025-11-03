/**
 * WhatsApp OAuth redirect URI
 * CRITICAL: This must be byte-for-byte identical between OAuth start and callback
 * to prevent "authorization code has been used" errors.
 */
export const WHATSAPP_REDIRECT_URI = `${window.location.origin}/setup/whatsapp/callback`;
