import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
    checkLoginState: () => void;
  }
}

export const WhatsAppLoginButton = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [configId, setConfigId] = useState<string | null>(null);
  const buttonContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeFacebookSDK = async () => {
      // Get Meta config
      const { data: configData } = await supabase.functions.invoke('get-meta-config');
      if (!configData?.appId || !configData?.configId) {
        console.error('Failed to get Meta config');
        setIsLoading(false);
        return;
      }

      setConfigId(configData.configId);

      // Set up the callback for login state
      window.checkLoginState = function() {
        window.FB.getLoginStatus(function(response: any) {
          console.log('Login state response:', response);
          if (response.status === 'connected') {
            console.log('✅ User connected successfully');
            // The setup data will be in the response
            console.log('Auth response:', response.authResponse);
          } else if (response.status === 'not_authorized') {
            console.log('⚠️ User logged into Facebook but not authorized');
          } else {
            console.log('ℹ️ User not logged into Facebook');
          }
        });
      };

      // Initialize FB SDK
      window.fbAsyncInit = function() {
        window.FB.init({
          appId: configData.appId,
          cookie: true,
          xfbml: true,
          version: 'v21.0'
        });

        console.log('✅ Facebook SDK initialized');
        setIsLoading(false);

        // Parse XFBML elements (the login button)
        if (buttonContainerRef.current) {
          window.FB.XFBML.parse(buttonContainerRef.current);
        }
      };

      // Load SDK script if not already loaded
      if (!document.getElementById('facebook-jssdk')) {
        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        document.body.appendChild(script);
      } else if (window.FB) {
        setIsLoading(false);
        window.FB.XFBML.parse(buttonContainerRef.current);
      }
    };

    initializeFacebookSDK();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!configId) {
    return (
      <div className="text-sm text-destructive">
        Configuration error. Please contact support.
      </div>
    );
  }

  return (
    <div ref={buttonContainerRef}>
      <div
        className="fb-login-button"
        data-config-id={configId}
        data-onlogin="checkLoginState();"
        data-width=""
        data-size="large"
        data-button-type="continue_with"
        data-auto-logout-link="false"
        data-use-continue-as="true"
      />
    </div>
  );
};
