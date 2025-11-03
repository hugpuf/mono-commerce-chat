import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearWorkspaceConnectionsCache } from "@/hooks/useWorkspaceConnections";

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
    
    // Store state in sessionStorage for retrieval in callback
    sessionStorage.setItem('wa_oauth_state', stateId);
    
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
    console.log('   • redirect_uri length:', (redirectUri || '').length);
    console.log('   • redirect_uri charCodes:', [...(redirectUri || '')].map((c: any) => (c as string).charCodeAt(0)));
    console.log('   • state:', stateId);
    console.log('   • scope: whatsapp_business_management,business_management,whatsapp_business_messaging');
    console.log('🔍 SDK Status:');
    console.log('   • FB SDK ready:', fbSdkReady);
    console.log('   • window.FB exists:', !!window.FB);
    console.log('⏰ Launch timestamp:', new Date().toISOString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Use FB.login with Embedded Signup (per Meta's official docs)
    window.FB.login(
      function(response: any) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📥 FB.LOGIN RESPONSE RECEIVED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Response:', response);
        console.log('Status:', response.status);
        
        if (response.authResponse) {
          const code = response.authResponse.code;
          console.log('✅ Authorization code received:', code);
          console.log('Auth Response:', response.authResponse);
          
          // ========== PROCESS IN-PLACE: IMMEDIATE BACKEND CALL ==========
          // Facebook SDK requires synchronous callback, but we can use IIFE for async work
          (async () => {
            try {
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              console.log('🚀 EMBEDDED SIGNUP DIRECT PATH - Processing in-place');
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              
              // Retrieve setup data from sessionStorage
              const setupDataStr = sessionStorage.getItem('wa_setup_data');
              const state = sessionStorage.getItem('wa_oauth_state');
              
              if (!state) {
                throw new Error('Missing OAuth state - session may have expired');
              }
              
              // Parse setup data from postMessage event
              let setupData = null;
              if (setupDataStr) {
                const parsedEvent = JSON.parse(setupDataStr);
                setupData = parsedEvent.data; // Extract the data object
                console.log('📦 Setup data retrieved from sessionStorage');
                console.log('   • WABA ID:', setupData?.waba_id);
                console.log('   • Phone Number ID:', setupData?.phone_number_id);
                console.log('   • Business ID:', setupData?.business_id);
              } else {
                console.warn('⚠️ No setup data in sessionStorage - proceeding anyway');
              }
              
              // Prepare payload for backend
              const payload = {
                code,
                state,
                redirect_uri: redirectUri,
                workspace_id: workspaceId,
                setup_data: setupData
              };
              
              console.log('📤 Invoking whatsapp-oauth-callback', {
                redirectUri,
                hasSetupData: !!setupData,
                state,
                codePrefix: code?.slice(0, 8),
                workspaceId,
                timestamp: new Date().toISOString()
              });
              
              // Call backend to complete OAuth flow
              try {
                const { data, error } = await supabase.functions.invoke('whatsapp-oauth-callback', {
                  body: payload
                });
                
                if (error) {
                  console.error('❌ Backend error:', {
                    message: error.message,
                    status: (error as any).status,
                    context: (error as any).context,
                    details: error
                  });
                  throw error;
                }
                
                console.log('✅ Backend processing successful:', data);
                
                // Clear sessionStorage
                sessionStorage.removeItem('wa_setup_data');
                sessionStorage.removeItem('wa_oauth_state');
                sessionStorage.removeItem('wa_flow_event');
                
                // Clear workspace connections cache
                if (workspaceId) {
                  clearWorkspaceConnectionsCache(workspaceId);
                }
                
                console.log('🧹 Cleared sessionStorage and cache');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                
                // Success! Show notification and navigate
                toast({
                  title: "Success!",
                  description: "WhatsApp account connected successfully.",
                });
                
                // Navigate to home page
                setIsConnecting(false);
                navigate('/setup/channel');
              } catch (backendError: any) {
                console.error('❌ Backend invocation failed:', {
                  message: backendError?.message,
                  status: backendError?.status,
                  stage: backendError?.stage,
                  stack: backendError?.stack
                });
                
                setIsConnecting(false);
                
                // Show user-friendly error based on stage
                const errorStage = backendError?.stage || 'unknown';
                const errorMessage = backendError?.message || 'Failed to connect WhatsApp account';
                
                toast({
                  title: "Connection Failed",
                  description: `Error at ${errorStage}: ${errorMessage}`,
                  variant: "destructive",
                });
              }
              
            } catch (outerError: any) {
              console.error('❌ Outer async error:', outerError);
              setIsConnecting(false);
              toast({
                title: "Connection Failed",
                description: outerError?.message || "Failed to complete WhatsApp connection",
                variant: "destructive",
              });
            }
          })();
          
        } else {
          console.warn('❌ User cancelled or authorization failed');
          console.log('Full response:', response);
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
        extras: {
          setup: {}
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
