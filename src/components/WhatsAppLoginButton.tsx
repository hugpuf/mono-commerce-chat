import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const WhatsAppLoginButton = () => {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [redirectUri, setRedirectUri] = useState<string | null>(null);
  const [setupData, setSetupData] = useState<any>(null);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    const initializeConfig = async () => {
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
      
      setIsLoading(false);
    };

    initializeConfig();

    // Add MessageEvent listener for Embedded Signup
    const handleMessage = async (event: MessageEvent) => {
      // Accept messages from any Facebook domain
      if (!event.origin.endsWith('.facebook.com')) {
        return;
      }
      
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          console.log('📦 Received Embedded Signup event:', data);
          
          if (data.event === 'FINISH') {
            const { phone_number_id, waba_id } = data.data;
            console.log('✅ WABA Setup Complete:', { phone_number_id, waba_id });
            const capturedData = data.data;
            setSetupData(capturedData);
            
            // Close popup if it exists
            if (popupRef.current && !popupRef.current.closed) {
              popupRef.current.close();
            }
            
            // Get workspace_id from sessionStorage
            const savedWorkspaceId = sessionStorage.getItem('wa_workspace_id');
            
            if (!savedWorkspaceId) {
              toast({
                title: "Error",
                description: "Workspace ID not found. Please try again.",
                variant: "destructive",
              });
              setIsConnecting(false);
              return;
            }
            
            // Call backend with setup_data
            supabase.functions
              .invoke('whatsapp-embedded-signup', {
                body: {
                  setup_data: capturedData,
                  workspace_id: savedWorkspaceId,
                },
              })
              .then(({ data: responseData, error }) => {
                if (error) {
                  console.error('Backend error:', error);
                  toast({
                    title: "Connection failed",
                    description: error.message || "Failed to complete WhatsApp connection",
                    variant: "destructive",
                  });
                } else {
                  console.log('Backend response:', responseData);
                  toast({
                    title: "Success!",
                    description: "WhatsApp connected successfully",
                  });
                  window.location.href = '/settings/integrations';
                }
                setIsConnecting(false);
                sessionStorage.removeItem('wa_workspace_id');
              });
          } else if (data.event === 'CANCEL') {
            console.warn('⚠️ User cancelled Embedded Signup at:', data.data.current_step);
            setIsConnecting(false);
            toast({
              title: "Cancelled",
              description: "WhatsApp signup was cancelled.",
              variant: "destructive",
            });
          } else if (data.event === 'ERROR') {
            console.error('❌ Embedded Signup error:', data.data.error_message);
            setIsConnecting(false);
            toast({
              title: "Error",
              description: data.data.error_message || "An error occurred during signup.",
              variant: "destructive",
            });
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
    
    // Generate cryptographically random state for Meta to echo back
    const stateId = crypto.randomUUID();
    
    console.log('🚀 Starting Embedded Signup flow');
    console.log('🔍 state_id (UUID):', stateId);
    console.log('🔍 config_id:', configId);
    console.log('🔍 workspace_id:', workspaceId);
    
    // Build the Embedded Signup URL (popup flow with postMessage)
    const signupUrl = new URL('https://business.facebook.com/messaging/whatsapp/onboard/');
    signupUrl.searchParams.set('app_id', appId);
    signupUrl.searchParams.set('config_id', configId);
    signupUrl.searchParams.set('state', stateId);
    
    // Store workspace_id in sessionStorage to associate with postMessage response
    sessionStorage.setItem('wa_workspace_id', workspaceId);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 EMBEDDED SIGNUP LAUNCH');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 Full Signup URL:', signupUrl.toString());
    console.log('📋 URL Parameters:');
    console.log('   • app_id:', appId);
    console.log('   • config_id:', configId);
    console.log('   • state:', stateId);
    console.log('⏰ Launch timestamp:', new Date().toISOString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Open Embedded Signup in a popup
    popupRef.current = window.open(
      signupUrl.toString(),
      'whatsapp_embedded_signup',
      'width=700,height=900,popup=yes,scrollbars=yes'
    );
    
    if (!popupRef.current) {
      toast({
        title: "Popup blocked",
        description: "Please allow popups for this site and try again.",
        variant: "destructive",
      });
      setIsConnecting(false);
      return;
    }
    
    console.log('✅ Popup opened, waiting for postMessage events...');
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
