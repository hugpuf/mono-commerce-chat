import { supabase } from "@/integrations/supabase/client";
import { WHATSAPP_REDIRECT_URI } from "@/lib/constants";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export default async function initiateWhatsAppOAuth() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 OAUTH INITIATION FROM CALLBACK PAGE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌐 Current URL:', window.location.href);
  console.log('📍 Invoking page matches redirect_uri:', window.location.pathname === '/setup/whatsapp/callback');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Get workspace ID from sessionStorage (set by WhatsAppLoginButton)
    const workspaceId = sessionStorage.getItem('wa_workspace_id');
    if (!workspaceId) {
      throw new Error('Workspace ID not found. Please try again from the channel setup page.');
    }

    // Get Meta config
    const { data: configData, error: configError } = await supabase.functions.invoke('get-meta-config');
    if (configError || !configData?.appId || !configData?.configId) {
      throw new Error('Failed to load Meta configuration');
    }

    const { appId, configId } = configData;
    const redirectUri = WHATSAPP_REDIRECT_URI;

    console.log('✅ Configuration loaded');
    console.log('   • App ID:', appId);
    console.log('   • Config ID:', configId);
    console.log('   • Redirect URI:', redirectUri);
    console.log('   • Workspace ID:', workspaceId);

    // Generate OAuth state
    const stateId = crypto.randomUUID();
    sessionStorage.setItem('wa_oauth_state', stateId);

    // Store state in database
    const { error: dbError } = await supabase
      .from('oauth_states')
      .insert({
        state: stateId,
        redirect_uri: redirectUri,
        app_id: appId,
        workspace_id: workspaceId
      });

    if (dbError) {
      console.error('Failed to store OAuth state:', dbError);
      throw new Error('Failed to prepare OAuth flow');
    }

    console.log('✅ OAuth state stored in database');

    // Initialize Facebook SDK
    await new Promise<void>((resolve, reject) => {
      // Check if SDK already loaded
      if (window.FB) {
        console.log('✅ Facebook SDK already loaded');
        resolve();
        return;
      }

      // Initialize SDK
      window.fbAsyncInit = function() {
        window.FB.init({
          appId: appId,
          autoLogAppEvents: true,
          xfbml: true,
          version: 'v24.0'
        });
        console.log('✅ Facebook SDK initialized');
        resolve();
      };

      // Set up postMessage listener for embedded signup events
      const handlePostMessage = (event: MessageEvent) => {
        if (!event.origin.endsWith('facebook.com')) return;
        
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'WA_EMBEDDED_SIGNUP') {
            console.log('📨 WA_EMBEDDED_SIGNUP EVENT:', data.event);
            if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA' || data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
              sessionStorage.setItem('wa_setup_data', JSON.stringify(data));
            } else if (data.event === 'CANCEL') {
              sessionStorage.setItem('wa_flow_event', JSON.stringify(data));
            }
          }
        } catch {}
      };

      window.addEventListener('message', handlePostMessage);

      // Load SDK script if not already present
      if (!document.getElementById('facebook-jssdk')) {
        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        script.onerror = () => reject(new Error('Failed to load Facebook SDK'));
        document.body.appendChild(script);
      }

      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('Facebook SDK initialization timeout')), 10000);
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 LAUNCHING FB.LOGIN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Parameters:');
    console.log('   • config_id:', configId);
    console.log('   • redirect_uri:', redirectUri);
    console.log('   • state:', stateId);
    console.log('   • Invoking page:', window.location.pathname);
    console.log('   • Match?', window.location.pathname === '/setup/whatsapp/callback');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Launch OAuth flow
    window.FB.login(
      function(response: any) {
        console.log('📥 FB.LOGIN RESPONSE:', response);
        
        if (response.authResponse?.code) {
          console.log('✅ Authorization code received');
          // Reload the page to process the callback normally
          // The code will be in the URL as a query parameter
          window.location.reload();
        } else {
          console.warn('❌ No authorization code received');
          // Navigate back to channel setup
          sessionStorage.removeItem('wa_workspace_id');
          window.location.href = '/setup/add-channel';
        }
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        redirect_uri: redirectUri,
        fallback_redirect_uri: redirectUri,
        state: stateId,
        extras: {
          setup: {}
        }
      }
    );

  } catch (error) {
    console.error('❌ OAuth initiation failed:', error);
    alert(error instanceof Error ? error.message : 'Failed to start WhatsApp connection');
    sessionStorage.removeItem('wa_workspace_id');
    window.location.href = '/setup/add-channel';
  }
}
