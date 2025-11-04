import { supabase } from "@/integrations/supabase/client";

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
  console.log('📍 Invoking page matches Meta configured callback route:', window.location.pathname === '/setup/whatsapp/callback');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Get workspace ID from sessionStorage (set by WhatsAppLoginButton)
    const workspaceId = sessionStorage.getItem('wa_workspace_id');
    if (!workspaceId) {
      throw new Error('Workspace ID not found. Please try again from the channel setup page.');
    }

    // Request server to create OAuth state and return configuration
    const { data: startData, error: startError } = await supabase.functions.invoke('start-whatsapp-oauth', {
      body: { workspace_id: workspaceId }
    });

    if (startError || !startData?.state || !startData?.appId || !startData?.configId) {
      throw new Error('Failed to initialize WhatsApp OAuth. Please try again.');
    }

    const { state: stateId, appId, configId } = startData;

    try {
      sessionStorage.setItem('wa_oauth_state', stateId);
    } catch (error) {
      console.warn('Unable to persist WhatsApp OAuth state in sessionStorage:', error);
    }

    console.log('✅ Configuration loaded');
    console.log('   • App ID:', appId);
    console.log('   • Config ID:', configId);
    console.log('   • Workspace ID:', workspaceId);

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

          const targetUrl = new URL(window.location.href);
          targetUrl.searchParams.delete('action');
          targetUrl.searchParams.set('code', response.authResponse.code);
          targetUrl.searchParams.set('state', response.authResponse.state ?? stateId);

          console.log('🔁 Redirecting browser to callback URL without initiate flag');
          window.location.href = targetUrl.toString();
          return;
        } else {
          console.warn('❌ No authorization code received');
          // Navigate back to channel setup
          sessionStorage.removeItem('wa_workspace_id');
          window.location.href = '/setup/channel';
        }
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
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
    window.location.href = '/setup/channel';
  }
}
