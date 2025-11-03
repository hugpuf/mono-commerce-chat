import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Global guard to ensure only one ES popup is ever open
declare global {
  interface Window {
    __WA_ES_POPUP__?: Window | null;
    __WA_ES_MESSAGE_HANDLER?: (event: MessageEvent) => void;
  }
}

export const WhatsAppLoginButton = () => {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [redirectUri, setRedirectUri] = useState<string | null>(null);
  
  // Refs to enforce single-window behavior
  const launchingRef = useRef(false); // Synchronous guard for double-click
  const popupRef = useRef<Window | null>(null); // Track current popup
  const popupCheckRef = useRef<NodeJS.Timeout | null>(null); // Interval ID for popup monitor

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

    // Dedupe listener: remove any existing handler before adding new one
    if (window.__WA_ES_MESSAGE_HANDLER) {
      console.log('🧹 Removing existing postMessage handler (deduping)');
      window.removeEventListener('message', window.__WA_ES_MESSAGE_HANDLER);
      window.__WA_ES_MESSAGE_HANDLER = undefined;
    }

    // Add MessageEvent listener for Embedded Signup (postMessage mode)
    const handleMessage = async (event: MessageEvent) => {
      // Accept any facebook.com domain (includes business.facebook.com, www.facebook.com, web.facebook.com)
      const isFacebookOrigin = event.origin.endsWith('.facebook.com') || event.origin === 'https://facebook.com';
      
      if (!isFacebookOrigin) {
        console.log('🚫 Ignored postMessage from non-Facebook origin:', event.origin);
        return;
      }
      
      console.log('📨 Received postMessage from Facebook:', { origin: event.origin, data: event.data });
      
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          console.log('📦 Embedded Signup event:', data);
          
          if (data.event === 'FINISH') {
            console.log('✅ Embedded Signup finished!', data.data);
            
            const { code, setup } = data.data;
            const state = sessionStorage.getItem('whatsapp_oauth_state');
            
            if (!code || !setup) {
              console.error('❌ Missing code or setup data from postMessage');
              toast({
                title: "Connection Failed",
                description: "WhatsApp signup didn't provide required data.",
                variant: "destructive",
              });
              setIsConnecting(false);
              return;
            }

            try {
              setIsConnecting(true);
              
              // Close popup and clear guards
              if (popupRef.current && !popupRef.current.closed) {
                popupRef.current.close();
              }
              popupRef.current = null;
              window.__WA_ES_POPUP__ = null;
              if (popupCheckRef.current) {
                clearInterval(popupCheckRef.current);
                popupCheckRef.current = null;
              }
              
              // Get redirect_uri from config
              const { data: configData } = await supabase.functions.invoke('get-meta-config');
              
              // Call our edge function with the code and setup data
              console.log('📤 Calling backend with postMessage data...');
              const { data: responseData, error } = await supabase.functions.invoke('whatsapp-oauth-callback', {
                body: {
                  code,
                  setup_data: setup,
                  state,
                  workspace_id: workspaceId,
                  redirect_uri: configData?.redirectUri
                }
              });

              if (error) throw error;

              console.log('✅ WhatsApp connected successfully:', responseData);
              toast({
                title: "WhatsApp Connected",
                description: "Your WhatsApp Business account is now connected.",
              });
              
              setIsConnecting(false);
              
              // Navigate to success page
              navigate('/setup/whatsapp/callback?success=true');
              
            } catch (error) {
              console.error('❌ Error connecting WhatsApp:', error);
              toast({
                title: "Connection Failed",
                description: error instanceof Error ? error.message : "Failed to connect WhatsApp",
                variant: "destructive",
              });
              setIsConnecting(false);
            }
          } else if (data.event === 'CANCEL') {
            console.log('ℹ️ User cancelled WhatsApp signup');
            // Close popup and clear guards
            if (popupRef.current && !popupRef.current.closed) {
              popupRef.current.close();
            }
            popupRef.current = null;
            window.__WA_ES_POPUP__ = null;
            if (popupCheckRef.current) {
              clearInterval(popupCheckRef.current);
              popupCheckRef.current = null;
            }
            setIsConnecting(false);
          } else if (data.event === 'ERROR') {
            console.error('❌ Error in WhatsApp signup:', data.data);
            // Close popup and clear guards
            if (popupRef.current && !popupRef.current.closed) {
              popupRef.current.close();
            }
            popupRef.current = null;
            window.__WA_ES_POPUP__ = null;
            if (popupCheckRef.current) {
              clearInterval(popupCheckRef.current);
              popupCheckRef.current = null;
            }
            toast({
              title: "Connection Error",
              description: "An error occurred during WhatsApp signup.",
              variant: "destructive",
            });
            setIsConnecting(false);
          }
        }
      } catch (err) {
        console.error('Error parsing postMessage:', err);
      }
    };

    // Store handler globally for deduping
    window.__WA_ES_MESSAGE_HANDLER = handleMessage;
    window.addEventListener('message', handleMessage);
    console.log('✅ postMessage listener attached');
    
    return () => {
      console.log('🧹 postMessage listener cleanup');
      window.removeEventListener('message', handleMessage);
      if (window.__WA_ES_MESSAGE_HANDLER === handleMessage) {
        window.__WA_ES_MESSAGE_HANDLER = undefined;
      }
      // Clear any running popup monitor
      if (popupCheckRef.current) {
        clearInterval(popupCheckRef.current);
        popupCheckRef.current = null;
      }
    };
  }, [workspaceId, toast, navigate]);

  const handleConnect = async () => {
    // Synchronous guard: prevent double launches
    if (launchingRef.current) {
      console.log('🛡️ Launch already in progress (launchingRef guard)');
      return;
    }
    
    // Check if an existing popup is still open
    if (window.__WA_ES_POPUP__ && !window.__WA_ES_POPUP__.closed) {
      console.log('🔄 Focusing existing ES popup window');
      window.__WA_ES_POPUP__.focus();
      return;
    }
    
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

    launchingRef.current = true;
    setIsConnecting(true);
    
    // Generate cryptographically random state (UUID only - no encoding)
    const stateId = crypto.randomUUID();
    
    // Store state in sessionStorage for postMessage handler
    sessionStorage.setItem('whatsapp_oauth_state', stateId);
    
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
    
    console.log('🚀 Starting WhatsApp Embedded Signup flow (PURE POSTMESSAGE MODE)');
    console.log('🔍 state_id (UUID):', stateId);
    console.log('🔍 config_id:', configId);
    
    // Build the WhatsApp Embedded Signup URL (business.facebook.com for ES)
    // CRITICAL: Do NOT include redirect_uri - this forces pure postMessage mode
    const signupUrl = new URL('https://business.facebook.com/messaging/whatsapp/onboard/');
    signupUrl.searchParams.set('app_id', appId);
    signupUrl.searchParams.set('config_id', configId);
    signupUrl.searchParams.set('state', stateId);
    
    // ========== CLIENT LAUNCH LOGGING ==========
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 WHATSAPP EMBEDDED SIGNUP - PURE POSTMESSAGE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 Full Signup URL:', signupUrl.toString());
    console.log('📋 URL Parameters:');
    console.log('   • app_id:', appId);
    console.log('   • config_id:', configId);
    console.log('   • redirect_uri:', 'OMITTED (pure postMessage mode) ✓');
    console.log('   • state (UUID):', stateId);
    console.log('🔍 Mode:');
    console.log('   • Popup window with postMessage listener ✓');
    console.log('   • No redirect_uri (prevents popup redirect) ✓');
    console.log('   • Waiting for postMessage with code + setup_data ✓');
    console.log('⏰ Launch timestamp:', new Date().toISOString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Open WhatsApp Embedded Signup in popup with stable name for reuse/focus
    const popup = window.open(
      signupUrl.toString(),
      'whatsapp_signup',
      'width=600,height=800,popup=yes,scrollbars=yes'
    );
    
    if (!popup) {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups for this site to connect WhatsApp.",
        variant: "destructive",
      });
      launchingRef.current = false;
      setIsConnecting(false);
      return;
    }
    
    console.log('✅ Popup window opened successfully');
    
    // Store popup in refs and global guard
    popupRef.current = popup;
    window.__WA_ES_POPUP__ = popup;
    launchingRef.current = false; // Launch complete, allow future clicks after this popup closes
    
    // Monitor popup close to reset state
    popupCheckRef.current = setInterval(() => {
      if (popup.closed) {
        console.log('ℹ️ Popup window closed by user');
        if (popupCheckRef.current) {
          clearInterval(popupCheckRef.current);
          popupCheckRef.current = null;
        }
        popupRef.current = null;
        window.__WA_ES_POPUP__ = null;
        setIsConnecting(false);
      }
    }, 500);
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
