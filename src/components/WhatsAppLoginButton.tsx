import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Global guards for single-window ES flow
declare global {
  interface Window {
    __WA_ES_POPUP__?: Window | null;
    __WA_ES_LOCK__?: boolean;
    __WA_ES_MESSAGE_HANDLER__?: (e: MessageEvent) => void;
  }
}

export const WhatsAppLoginButton = () => {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);

  useEffect(() => {
    const initializeConfig = async () => {
      // Get Meta config from backend
      const { data: configData } = await supabase.functions.invoke('get-meta-config');
      if (!configData?.appId || !configData?.configId) {
        console.error('Failed to get Meta config');
        setIsLoading(false);
        return;
      }

      setConfigId(configData.configId);
      setAppId(configData.appId);
      
      console.log('✅ Meta config loaded:', {
        appId: configData.appId,
        configId: configData.configId
      });
      
      setIsLoading(false);
    };

    initializeConfig();

    // Deduped postMessage listener for Embedded Signup
    const handler = (event: MessageEvent) => {
      try {
        const host = new URL(event.origin).hostname;
        if (!host.endsWith('.facebook.com')) {
          return;
        }

        const data = JSON.parse(event.data);
        if (data?.type !== 'WA_EMBEDDED_SIGNUP') {
          return;
        }

        console.log('📦 ES event:', data.event, data.data);

        const cleanup = () => {
          if (window.__WA_ES_POPUP__ && !window.__WA_ES_POPUP__.closed) {
            window.__WA_ES_POPUP__.close();
          }
          window.__WA_ES_POPUP__ = null;
          window.__WA_ES_LOCK__ = false;
          setIsConnecting(false);
        };

        if (data.event === 'FINISH') {
          sessionStorage.setItem('wa_setup_data', JSON.stringify(data.data));
          console.log('✅ ES FINISH:', data.data);
          cleanup();
          toast({ 
            title: "WhatsApp connected", 
            description: "Setup data received successfully." 
          });
        } else if (data.event === 'CANCEL') {
          console.warn('⚠️ ES CANCEL:', data.data?.current_step);
          cleanup();
          toast({ 
            title: "Setup cancelled", 
            description: "WhatsApp setup was cancelled.", 
            variant: "destructive" 
          });
        } else if (data.event === 'ERROR') {
          console.error('❌ ES ERROR:', data.data?.error_message);
          cleanup();
          toast({ 
            title: "Setup error", 
            description: data.data?.error_message || "An error occurred during setup.", 
            variant: "destructive" 
          });
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    // Remove previous handler if exists
    if (window.__WA_ES_MESSAGE_HANDLER__) {
      window.removeEventListener('message', window.__WA_ES_MESSAGE_HANDLER__ as EventListener);
    }
    
    window.addEventListener('message', handler);
    window.__WA_ES_MESSAGE_HANDLER__ = handler;
    console.log('✅ ES message handler attached');

    return () => {
      window.removeEventListener('message', handler);
      if (window.__WA_ES_MESSAGE_HANDLER__ === handler) {
        window.__WA_ES_MESSAGE_HANDLER__ = undefined;
      }
      console.log('🔄 ES message handler removed');
    };
  }, [toast]);

  const handleConnect = async () => {
    if (!configId || !appId) {
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

    // Single-window guard: reuse existing popup
    if (window.__WA_ES_POPUP__ && !window.__WA_ES_POPUP__.closed) {
      console.log('🔁 Reusing existing ES popup');
      window.__WA_ES_POPUP__.focus();
      setIsConnecting(true);
      return;
    }

    // Single-window guard: prevent concurrent launches
    if (window.__WA_ES_LOCK__) {
      console.log('⛔ ES launch locked, ignoring extra click');
      return;
    }

    window.__WA_ES_LOCK__ = true;
    setIsConnecting(true);
    
    // Generate state and store in database
    const stateId = crypto.randomUUID();
    
    try {
      const { error: dbError } = await supabase
        .from('oauth_states')
        .insert({
          state: stateId,
          redirect_uri: '', // Empty for ES flow (uses postMessage)
          app_id: appId,
          workspace_id: workspaceId
        });
      
      if (dbError) {
        console.error('Failed to store state:', dbError);
        toast({
          title: "Error",
          description: "Failed to prepare setup. Please try again.",
          variant: "destructive",
        });
        window.__WA_ES_LOCK__ = false;
        setIsConnecting(false);
        return;
      }
    } catch (err) {
      console.error('Error storing state:', err);
      toast({
        title: "Error",
        description: "Failed to prepare setup. Please try again.",
        variant: "destructive",
      });
      window.__WA_ES_LOCK__ = false;
      setIsConnecting(false);
      return;
    }
    
    // Build pure Embedded Signup URL (NO redirect_uri)
    const signupUrl = new URL('https://business.facebook.com/messaging/whatsapp/onboard/');
    signupUrl.searchParams.set('app_id', appId);
    signupUrl.searchParams.set('config_id', configId);
    signupUrl.searchParams.set('state', stateId);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 ES LAUNCH - Pure Embedded Signup');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 Full ES URL:', signupUrl.toString());
    console.log('📋 Parameters:');
    console.log('   • app_id:', appId);
    console.log('   • config_id:', configId);
    console.log('   • state:', stateId);
    console.log('   • redirect_uri: NOT SET (postMessage flow)');
    console.log('⏰ Launch timestamp:', new Date().toISOString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Open popup
    const popup = window.open(
      signupUrl.toString(),
      'whatsapp_es_signup',
      'width=700,height=900,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      console.error('❌ Popup blocked');
      toast({
        title: "Popup blocked",
        description: "Please allow popups and try again.",
        variant: "destructive",
      });
      window.__WA_ES_LOCK__ = false;
      setIsConnecting(false);
      return;
    }

    window.__WA_ES_POPUP__ = popup;
    console.log('✅ ES popup opened');

    // Monitor popup close
    const closeCheck = setInterval(() => {
      if (!window.__WA_ES_POPUP__ || window.__WA_ES_POPUP__.closed) {
        clearInterval(closeCheck);
        window.__WA_ES_POPUP__ = null;
        window.__WA_ES_LOCK__ = false;
        setIsConnecting(false);
        console.log('ℹ️ ES popup closed, flow reset');
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

  if (!configId || !appId) {
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
