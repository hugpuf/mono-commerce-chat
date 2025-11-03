/**
 * WhatsApp Embedded Signup URL Builder
 * Single source of truth for launching Meta's WhatsApp Business Embedded Signup flow
 */

export interface WaEmbeddedSignupConfig {
  appId: string;
  redirectUri: string;
  configId: string;
  state: string;
  scopes?: string;
  enableRerequest?: boolean;
  debug?: boolean;
}

const DEFAULT_SCOPES = 'whatsapp_business_management,business_management,whatsapp_business_messaging';
const META_API_VERSION = 'v24.0';

/**
 * Build WhatsApp Embedded Signup launch URL
 * 
 * CRITICAL: This uses the /dialog/whatsapp_business_embedded_signup endpoint,
 * NOT /dialog/oauth. The Embedded Signup endpoint is required for Meta to
 * return the setup_data parameter with WABA and phone information.
 * 
 * @param config - Configuration object
 * @returns Complete URL ready for redirect
 */
export function buildWaEmbeddedSignupUrl(config: WaEmbeddedSignupConfig): URL {
  const {
    appId,
    redirectUri,
    configId,
    state,
    scopes = DEFAULT_SCOPES,
    enableRerequest = false,
    debug = false
  } = config;

  // Validation
  if (!appId || !redirectUri || !configId || !state) {
    throw new Error('Missing required parameters for WA Embedded Signup URL');
  }

  // Build the CORRECT endpoint for Embedded Signup
  const url = new URL(`https://www.facebook.com/${META_API_VERSION}/dialog/whatsapp_business_embedded_signup`);
  
  // Set parameters in the correct order
  url.searchParams.set('app_id', appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('config_id', configId);
  url.searchParams.set('state', state);
  url.searchParams.set('scope', scopes);
  
  // Optional: force re-authorization
  if (enableRerequest) {
    url.searchParams.set('auth_type', 'rerequest');
  }

  // Debug logging (only if enabled via env/flag)
  if (debug || import.meta.env.VITE_DEBUG_WA_ES === 'true') {
    console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.info('🚀 WA_ES LAUNCH URL');
    console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.info('🌐 Full URL:', url.toString());
    console.info('📋 Parameters:');
    console.info('   • app_id:', appId);
    console.info('   • redirect_uri:', redirectUri);
    console.info('   • config_id:', configId);
    console.info('   • state:', state.substring(0, 8) + '...');
    console.info('   • scope:', scopes);
    console.info('   • auth_type:', enableRerequest ? 'rerequest' : 'none');
    console.info('⏰ Timestamp:', new Date().toISOString());
    console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  return url;
}

/**
 * Log startup configuration check (call once on component mount)
 */
export function logWaEmbeddedSignupConfig(config: {
  appId: string;
  configId: string;
  redirectUri: string;
  scopes?: string;
}): void {
  if (import.meta.env.VITE_DEBUG_WA_ES === 'true') {
    console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.info('🔍 WA_ES_CONFIG_CHECK');
    console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.info('📋 Configuration loaded:');
    console.info('   • appId:', config.appId);
    console.info('   • configId:', config.configId);
    console.info('   • redirectUriFromServer:', config.redirectUri);
    console.info('   • scopes:', config.scopes || DEFAULT_SCOPES);
    console.info('⏰ Timestamp:', new Date().toISOString());
    console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}
