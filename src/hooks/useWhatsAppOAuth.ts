import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WHATSAPP_REDIRECT_URI } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

console.warn('⚠️ useWhatsAppOAuth hook is not currently used. Prefer WhatsAppLoginButton for OAuth flow.');

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export const useWhatsAppOAuth = () => {
  const { workspaceId } = useWorkspace();
  const [fbSdkReady, setFbSdkReady] = useState(false);

  useEffect(() => {
    // Load Facebook SDK
    const loadFacebookSdk = async () => {
      // Get app ID first
      const { data: configData } = await supabase.functions.invoke('get-meta-config');
      if (!configData?.appId) return;

      // Initialize FB SDK
      window.fbAsyncInit = function() {
        window.FB.init({
          appId: configData.appId,
          cookie: true,
          xfbml: true,
          version: 'v24.0'
        });
        
        // Check login status after SDK is ready
        window.FB.getLoginStatus(function(response: any) {
          console.log('FB Login Status:', response);
          if (response.status === 'connected') {
            console.log('✅ User is logged into Facebook and has authorized the app');
          } else if (response.status === 'not_authorized') {
            console.log('⚠️ User is logged into Facebook but has not authorized the app');
          } else {
            console.log('ℹ️ User is not logged into Facebook');
          }
          setFbSdkReady(true);
        });
        
        console.log('✅ Facebook SDK initialized');
      };

      // Load SDK script if not already loaded
      if (!document.getElementById('facebook-jssdk')) {
        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        document.body.appendChild(script);
      } else if (window.FB) {
        setFbSdkReady(true);
      }
    };

    loadFacebookSdk();
  }, []);

  const initiateOAuth = async () => {
    if (!workspaceId) {
      throw new Error("No workspace selected");
    }

    if (!fbSdkReady || !window.FB) {
      throw new Error("Facebook SDK not loaded yet. Please try again.");
    }

    // Get the Meta Config ID from the edge function
    const { data: configData, error: configError } = await supabase.functions.invoke('get-meta-config');
    
    if (configError || !configData?.configId) {
      console.error('Failed to get Meta config:', configError);
      throw new Error("WhatsApp configuration not set up. Please contact support.");
    }

    const configId = configData.configId;

    // Encode workspace in state for callback
    const state = btoa(JSON.stringify({ ws: workspaceId }));

    console.log("🚀 Initiating WhatsApp Embedded Signup");
    
    // Use FB.login with Embedded Signup - this opens the popup
    window.FB.login(
      function(response: any) {
        console.log('FB.login response:', response);
        
        if (response.status === 'connected') {
          console.log('✅ User authorized - status connected');
          console.log('Auth response:', response.authResponse);
        } else if (response.status === 'not_authorized') {
          console.log('⚠️ User is logged into Facebook but not authorized the app');
        } else {
          console.log('❌ User cancelled login or not logged into Facebook');
        }
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        redirect_uri: WHATSAPP_REDIRECT_URI,
        fallback_redirect_uri: WHATSAPP_REDIRECT_URI,
        extras: {
          setup: {},
          featureType: '',
          sessionInfoVersion: 2
        }
      }
    );
  };

  return { initiateOAuth, fbSdkReady };
};
