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
  const [setupData, setSetupData] = useState<any>(null);

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

      // Initialize FB SDK for Embedded Signup
      window.fbAsyncInit = function() {
        window.FB.init({
          appId: configData.appId,
          autoLogAppEvents: true,
          cookie: true,
          xfbml: true,
          version: 'v24.0'
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

    // Add MessageEvent listener for Embedded Signup
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from Facebook
      if (event.origin !== "https://www.facebook.com" && 
          event.origin !== "https://web.facebook.com") {
        return;
      }
      
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          console.log('📦 Received Embedded Signup event:', data);
          
          if (data.event === 'FINISH') {
            const { phone_number_id, waba_id } = data.data;
            console.log('✅ WABA Setup Complete:', { phone_number_id, waba_id });
            setSetupData(data.data);
          } else if (data.event === 'CANCEL') {
            console.warn('⚠️ User cancelled Embedded Signup at:', data.data.current_step);
          } else if (data.event === 'ERROR') {
            console.error('❌ Embedded Signup error:', data.data.error_message);
          }
        }
      } catch {
        // Non-JSON message, ignore
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleConnect = async () => {
    if (!configId || !appId) {
      console.error('Config ID or App ID missing');
      toast({
        title: "Error",
        description: "Configuration missing. Please refresh the page.",
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
    
    // Define redirect_uri upfront
    const redirectUri = `${window.location.origin}/setup/whatsapp/callback`;
    
    // Generate cryptographically random state
    const state = crypto.randomUUID();
    
    // Store redirect_uri, app_id, and workspace_id in database (persisted for token exchange)
    try {
      const { error: dbError } = await supabase
        .from('oauth_states')
        .insert({
          state,
          redirect_uri: redirectUri,
          app_id: appId,
          workspace_id: workspaceId
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
    
    console.log('🚀 Starting Embedded Signup flow with FB.login');
    console.log('🔍 redirect_uri:', redirectUri);
    console.log('🔍 state:', state);
    console.log('🔍 config_id:', configId);
    
    // Use FB.login with Embedded Signup (popup mode)
    window.FB.login(
      (response: any) => {
        console.log('✅ FB.login response:', response);
        
        if (response.authResponse && response.authResponse.code) {
          const code = response.authResponse.code;
          
          // Wait for MessageEvent to populate setupData
          setTimeout(() => {
            console.log('🔄 Redirecting to callback with code and setup data');
            
            // Construct callback URL
            const callbackUrl = new URL(redirectUri);
            callbackUrl.searchParams.set('code', code);
            callbackUrl.searchParams.set('state', state);
            
            // Add setup_data to hash if available
            if (setupData) {
              console.log('📦 Including setup_data in redirect:', setupData);
              callbackUrl.hash = `setup=${encodeURIComponent(JSON.stringify(setupData))}`;
            } else {
              console.warn('⚠️ No setup_data received from MessageEvent');
            }
            
            window.location.assign(callbackUrl.toString());
          }, 500); // Small delay to ensure MessageEvent is processed
        } else {
          console.log('❌ User cancelled or did not authorize');
          setIsConnecting(false);
          toast({
            title: "Cancelled",
            description: "WhatsApp connection was cancelled.",
            variant: "destructive",
          });
        }
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          sessionInfoVersion: "3",
          version: "v3"
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
