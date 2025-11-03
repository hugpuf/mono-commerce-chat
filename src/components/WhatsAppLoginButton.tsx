import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export const WhatsAppLoginButton = () => {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [fbSdkReady, setFbSdkReady] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [redirectUri, setRedirectUri] = useState<string | null>(null);

  useEffect(() => {
    const initializeSDK = async () => {
      // Get Meta config including redirect_uri from backend (single source of truth)
      const { data: configData } = await supabase.functions.invoke('get-meta-config');
      if (!configData?.appId || !configData?.configId || !configData?.redirectUri) {
        console.error('Failed to get Meta config');
        setIsLoading(false);
        return;
      }

      setConfigId(configData.configId);
      setAppId(configData.appId);
      setRedirectUri(configData.redirectUri);
      
      console.log('✅ Meta config loaded:', {
        appId: configData.appId,
        configId: configData.configId,
        redirectUri: configData.redirectUri
      });

      // Initialize Facebook SDK
      window.fbAsyncInit = function() {
        window.FB.init({
          appId: configData.appId,
          cookie: true,
          xfbml: true,
          version: 'v24.0'
        });
        
        console.log('✅ Facebook SDK initialized');
        setFbSdkReady(true);
      };

      // Load SDK script if not already loaded
      if (!document.getElementById('facebook-jssdk')) {
        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      } else if (window.FB) {
        setFbSdkReady(true);
      }
      
      setIsLoading(false);
    };

    initializeSDK();
  }, []);

  const handleConnect = async () => {
    if (!configId || !appId || !redirectUri) {
      console.error('Config incomplete');
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

    if (!fbSdkReady || !window.FB) {
      toast({
        title: "Error",
        description: "Facebook SDK not loaded. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    
    // Generate cryptographically random state (UUID only - no encoding)
    const stateId = crypto.randomUUID();
    
    // Store state, redirect_uri, app_id, and workspace_id in database
    try {
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

    // ========== FB.LOGIN LAUNCH ==========
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 LAUNCHING FB.LOGIN - WhatsApp Embedded Signup');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Parameters:');
    console.log('   • config_id:', configId);
    console.log('   • response_type: code');
    console.log('   • override_default_response_type: true');
    console.log('   • redirect_uri:', redirectUri);
    console.log('   • state:', stateId);
    console.log('   • scope: whatsapp_business_management,business_management,whatsapp_business_messaging');
    console.log('🔍 SDK Status:');
    console.log('   • FB SDK ready:', fbSdkReady);
    console.log('   • window.FB exists:', !!window.FB);
    console.log('⏰ Launch timestamp:', new Date().toISOString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Use FB.login with Embedded Signup configuration
    window.FB.login(
      function(response: any) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📥 FB.LOGIN RESPONSE RECEIVED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Response:', response);
        console.log('Status:', response.status);
        
        if (response.status === 'connected') {
          console.log('✅ User connected and authorized');
          console.log('Auth Response:', response.authResponse);
          
          // Check if setup data is included
          if (response.authResponse?.setup) {
            console.log('✅ Setup data received:', response.authResponse.setup);
          } else {
            console.warn('⚠️ No setup data in authResponse');
          }
          
          // The FB.login will trigger a redirect to our callback URL with code and setup params
          // No need to manually navigate - Facebook handles this
          
        } else if (response.status === 'not_authorized') {
          console.warn('⚠️ User logged into Facebook but did not authorize the app');
          setIsConnecting(false);
          toast({
            title: "Authorization Required",
            description: "You must authorize the app to connect WhatsApp.",
            variant: "destructive",
          });
        } else {
          console.warn('❌ User cancelled or not logged into Facebook');
          setIsConnecting(false);
          toast({
            title: "Cancelled",
            description: "WhatsApp connection was cancelled.",
          });
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        redirect_uri: redirectUri,
        state: stateId,
        scope: 'whatsapp_business_management,business_management,whatsapp_business_messaging',
        extras: {
          setup: {},
          feature: 'whatsapp_embedded_signup',
          sessionInfoVersion: '3'
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

  if (!configId || !redirectUri) {
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
