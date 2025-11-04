import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearWorkspaceConnectionsCache } from "@/hooks/useWorkspaceConnections";
import { WHATSAPP_REDIRECT_URI_STORAGE_KEY } from "@/lib/constants";

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

      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(WHATSAPP_REDIRECT_URI_STORAGE_KEY, configData.redirectUri);
        }
      } catch (error) {
        console.warn('Unable to persist WhatsApp redirect URI in sessionStorage:', error);
      }
      
      console.log('✅ Meta config loaded:', {
        appId: configData.appId,
        configId: configData.configId,
        redirectUri: configData.redirectUri
      });
      console.log('🔍 REDIRECT URI CHECK:');
      console.log('  - Raw value from backend:', configData.redirectUri);
      console.log('  - Length:', configData.redirectUri?.length);
      console.log('  - Bytes:', [...(configData.redirectUri || '')].map(c => c.charCodeAt(0)));

      // Initialize Facebook SDK per Meta's official docs
      window.fbAsyncInit = function() {
        window.FB.init({
          appId: configData.appId,
          autoLogAppEvents: true,
          xfbml: true,
          version: 'v24.0'
        });
        
        console.log('✅ Facebook SDK initialized');
        setFbSdkReady(true);
      };

      // Session logging message event listener (Meta's official implementation)
      const handlePostMessage = (event: MessageEvent) => {
        if (!event.origin.endsWith('facebook.com')) return;
        
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'WA_EMBEDDED_SIGNUP') {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📨 WA_EMBEDDED_SIGNUP EVENT via postMessage');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('Event type:', data.event);
            console.log('Full data:', data);
            
            // Handle different event types
            if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA' || data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
              // Successful completion
              console.log('✅ Flow completed successfully');
              console.log('   • Phone Number ID:', data.data?.phone_number_id);
              console.log('   • WABA ID:', data.data?.waba_id);
              console.log('   • Business ID:', data.data?.business_id);
              console.log('   • Ad Accounts:', data.data?.ad_account_ids);
              console.log('   • Pages:', data.data?.page_ids);
              console.log('   • Datasets:', data.data?.dataset_ids);
              
              // Store for callback page
              sessionStorage.setItem('wa_setup_data', JSON.stringify(data));
              
            } else if (data.event === 'CANCEL') {
              // Flow abandoned or error reported
              if (data.data?.error_id) {
                console.warn('❌ User reported error');
                console.warn('   • Error Message:', data.data.error_message);
                console.warn('   • Error ID:', data.data.error_id);
                console.warn('   • Session ID:', data.data.session_id);
                console.warn('   • Timestamp:', data.data.timestamp);
              } else {
                console.warn('⚠️ Flow abandoned');
                console.warn('   • Current Step:', data.data?.current_step);
              }
              
              // Store for logging/debugging
              sessionStorage.setItem('wa_flow_event', JSON.stringify(data));
              
              setIsConnecting(false);
              toast({
                title: "Connection Cancelled",
                description: data.data?.error_message || "WhatsApp signup was cancelled.",
                variant: "destructive",
              });
            }
            
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          }
        } catch {
          console.log('postMessage event (non-JSON):', event.data);
        }
      };

      window.addEventListener('message', handlePostMessage);

      // Load SDK script if not already loaded
      if (!document.getElementById('facebook-jssdk')) {
        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        document.body.appendChild(script);
      } else if (window.FB) {
        setFbSdkReady(true);
      }
      
      setIsLoading(false);

      // Cleanup
      return () => {
        window.removeEventListener('message', handlePostMessage);
      };
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

    setIsConnecting(true);
    
    console.log('🔄 Navigating to callback page to initiate OAuth from correct URL');
    
    // Store workspace ID for the initiator
    sessionStorage.setItem('wa_workspace_id', workspaceId);
    
    // Navigate to callback page with initiate action
    // This ensures FB.login() is called from /setup/whatsapp/callback,
    // making the invoking page URL match the redirect_uri
    navigate('/setup/whatsapp/callback?action=initiate');
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
