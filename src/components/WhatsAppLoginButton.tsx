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

      // Initialize FB SDK (not used for OAuth, but kept for compatibility)
      window.fbAsyncInit = function() {
        window.FB.init({
          appId: configData.appId,
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
    
    // Define redirect_uri upfront - MUST be byte-for-byte identical throughout flow
    const redirectUri = `${window.location.origin}/setup/whatsapp/callback`;
    
    // Generate cryptographically random state (NOT deterministic!)
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
    
    // Compute SHA-256 hash for diagnostics
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(redirectUri)
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    console.log('🚀 Starting OAuth flow with manual dialog');
    console.log('🔍 redirect_uri:', redirectUri);
    console.log('🔍 SHA256 hash:', hashHex);
    console.log('🔍 state:', state);
    
    // Build OAuth URL manually for full control over redirect_uri
    const dialogUrl = new URL('https://www.facebook.com/v24.0/dialog/oauth');
    dialogUrl.searchParams.set('client_id', appId);
    dialogUrl.searchParams.set('redirect_uri', redirectUri); // Raw - URL API handles encoding
    dialogUrl.searchParams.set('response_type', 'code');
    dialogUrl.searchParams.set('config_id', configId); // ← This enables Embedded Signup
    dialogUrl.searchParams.set('state', state);
    dialogUrl.searchParams.set('scope', 'whatsapp_business_management,business_management,whatsapp_business_messaging');
    
    console.log('🔗 OAuth Dialog URL (first 150 chars):', dialogUrl.toString().substring(0, 150) + '...');
    
    // Full-page redirect to Facebook OAuth dialog
    window.location.assign(dialogUrl.toString());
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
