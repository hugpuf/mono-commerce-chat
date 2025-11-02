import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
    checkLoginState: () => void;
  }
}

export const WhatsAppLoginButton = () => {
  const { workspaceId } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);

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
      setAppId(configData.appId);

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
      }
    };

    initializeFacebookSDK();
  }, []);

  const handleConnect = async () => {
    if (!window.FB || !configId || !appId) {
      console.error('Facebook SDK not ready or config missing');
      toast({
        title: "Error",
        description: "Facebook SDK not loaded or App ID missing. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    if (!workspaceId) {
      console.error('No workspace ID available');
      toast({
        title: "Error",
        description: "Workspace not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    
    // Define redirect_uri upfront - MUST be byte-for-byte identical throughout flow
    const redirectUri = `${window.location.origin}/setup/whatsapp/callback`;
    
    // Generate state parameter
    const state = btoa(JSON.stringify({ ws: workspaceId }));
    
    // Store redirect_uri and app_id in database (persisted for token exchange)
    try {
      const { error: dbError } = await supabase
        .from('oauth_states')
        .insert({
          state,
          redirect_uri: redirectUri,
          app_id: appId
        });
      
      if (dbError) {
        console.error('Failed to store OAuth state:', dbError);
        toast({
          title: "Error",
          description: "Failed to prepare OAuth flow. Please try again.",
          variant: "destructive",
        });
        setIsConnecting(false);
        return;
      }
    } catch (err) {
      console.error('Error storing OAuth state:', err);
      toast({
        title: "Error",
        description: "Failed to prepare OAuth flow. Please try again.",
        variant: "destructive",
      });
      setIsConnecting(false);
      return;
    }
    
    // Compute SHA-256 hash for diagnostics
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(redirectUri)
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    console.log('🚀 Starting OAuth flow');
    console.log('🔍 redirect_uri:', redirectUri);
    console.log('🔍 SHA256 hash:', hashHex);
    console.log('🔍 state:', state);
    
    window.FB.login(
      (response: any) => {
        console.log('✅ FB.login response received:', response);
        
        if (response.authResponse && response.authResponse.code) {
          console.log('✅ Embedded Signup completed!', response.authResponse);
          
          // Extract the code
          const code = response.authResponse.code;
          
          // Redirect to callback URL (state already persisted in DB, setup data in hash)
          const redirectUrl = `${redirectUri}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
          
          console.log('🔄 Redirecting to callback with code and state...');
          window.location.replace(redirectUrl);
        } else {
          console.log('❌ User cancelled login or did not fully authorize.');
          setIsConnecting(false);
        }
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        redirect_uri: redirectUri,  // Explicitly pass redirect_uri to FB.login
        extras: {
          setup: 1  // Enable Embedded Signup
        }
      }
    );
  };

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
    <Button 
      onClick={handleConnect} 
      disabled={isConnecting}
      className="w-full"
    >
      {isConnecting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        'Connect WhatsApp'
      )}
    </Button>
  );
};
