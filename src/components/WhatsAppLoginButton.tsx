import { useEffect, useState } from "react";
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
            const capturedData = data.data;
            setSetupData(capturedData);
            
            // Store in sessionStorage for callback page to retrieve
            sessionStorage.setItem('wa_setup_data', JSON.stringify(capturedData));
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
    
    console.log('🚀 Starting OAuth dialog flow');
    console.log('🔍 redirect_uri:', redirectUri);
    console.log('🔍 state_id (UUID):', stateId);
    console.log('🔍 config_id:', configId);
    
    // Build the OAuth dialog URL (let config_id control Embedded Signup)
    const dialogUrl = new URL('https://www.facebook.com/v24.0/dialog/oauth');
    dialogUrl.searchParams.set('client_id', appId);
    dialogUrl.searchParams.set('redirect_uri', redirectUri);
    dialogUrl.searchParams.set('response_type', 'code');
    dialogUrl.searchParams.set('config_id', configId);
    dialogUrl.searchParams.set('state', stateId);
    dialogUrl.searchParams.set('scope', 'whatsapp_business_management,business_management,whatsapp_business_messaging');
    
    // ========== CLIENT LAUNCH LOGGING ==========
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 OAUTH LAUNCH - Full Diagnostic');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 Full OAuth URL:', dialogUrl.toString());
    console.log('📋 URL Parameters:');
    console.log('   • client_id:', appId);
    console.log('   • redirect_uri:', redirectUri);
    console.log('   • config_id:', configId);
    console.log('   • state:', stateId);
    console.log('   • response_type: code');
    console.log('   • scope: whatsapp_business_management,business_management,whatsapp_business_messaging');
    console.log('🔍 URL Validation:');
    console.log('   • redirect_uri has trailing slash?', redirectUri.endsWith('/'));
    console.log('   • redirect_uri length:', redirectUri.length);
    console.log('   • redirect_uri protocol:', redirectUri.startsWith('https://') ? 'HTTPS ✓' : 'INVALID ✗');
    console.log('   • config_id present?', configId ? 'YES ✓' : 'NO ✗');
    console.log('⏰ Launch timestamp:', new Date().toISOString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Redirect to OAuth dialog (not popup, full redirect)
    window.location.assign(dialogUrl.toString());
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
