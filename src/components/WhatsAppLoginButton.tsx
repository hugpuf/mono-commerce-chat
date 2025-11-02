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

  const handleConnect = () => {
    if (!window.FB || !configId) {
      console.error('Facebook SDK not ready or config missing');
      return;
    }

    if (!workspaceId) {
      console.error('No workspace ID available');
      return;
    }

    setIsConnecting(true);
    
    window.FB.login(
      async (response: any) => {
        console.log('Login response:', response);
        
        if (response.authResponse && response.authResponse.code) {
          console.log('✅ Successfully connected!', response.authResponse);
          
          try {
            // Extract the code and setup data
            const code = response.authResponse.code;
            const setup = response.authResponse.setup || {};
            
            // Call the edge function directly
            const { data, error } = await supabase.functions.invoke('whatsapp-oauth-callback', {
              body: {
                code: code,
                workspace_id: workspaceId,
                state: workspaceId,
                redirect_uri: `${window.location.origin}/setup/whatsapp/callback`,
                setup_data: setup
              }
            });

            if (error) throw error;

            console.log('✅ WhatsApp connected successfully:', data);
            
            toast({
              title: "WhatsApp Connected",
              description: "Your WhatsApp Business account has been connected successfully.",
            });

            // Navigate to settings or home
            navigate('/settings/integrations');
          } catch (error: any) {
            console.error('❌ Error connecting WhatsApp:', error);
            toast({
              title: "Connection Failed",
              description: error.message || "Failed to connect WhatsApp. Please try again.",
              variant: "destructive",
            });
          } finally {
            setIsConnecting(false);
          }
        } else {
          console.log('❌ User cancelled login or did not fully authorize.');
          setIsConnecting(false);
        }
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
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
