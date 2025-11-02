import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WHATSAPP_REDIRECT_URI } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

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
          version: 'v21.0'
        });
        setFbSdkReady(true);
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
    
    // Use FB.login with Embedded Signup
    window.FB.login(
      function(response: any) {
        console.log('FB.login response:', response);
        if (response.authResponse) {
          console.log('✅ User authorized the app');
          // The callback page will handle the rest
        } else {
          console.log('❌ User cancelled login or did not authorize');
        }
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
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
