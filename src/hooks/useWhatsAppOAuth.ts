import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WHATSAPP_REDIRECT_URI } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";

export const useWhatsAppOAuth = () => {
  const { workspaceId } = useWorkspace();

  const initiateOAuth = async () => {
    if (!workspaceId) {
      throw new Error("No workspace selected");
    }

    // Get the Meta App ID and Config ID from the edge function
    const { data: configData, error: configError } = await supabase.functions.invoke('get-meta-config');
    
    if (configError || !configData?.appId || !configData?.configId) {
      console.error('Failed to get Meta config:', configError);
      throw new Error("WhatsApp configuration not set up. Please contact support.");
    }

    const appId = configData.appId;
    const configId = configData.configId;

    // Encode workspace in state for callback
    const state = btoa(JSON.stringify({ ws: workspaceId }));

    // Build the Meta Embedded Signup URL
    const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    authUrl.searchParams.set("client_id", appId);  // Use App ID as client_id
    authUrl.searchParams.set("redirect_uri", WHATSAPP_REDIRECT_URI);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("config_id", configId);  // Config ID as separate param
    authUrl.searchParams.set("extras", JSON.stringify({
      setup: {},
      featureType: "",
      sessionInfoVersion: 2
    }));

    console.log("🚀 Initiating WhatsApp OAuth with Embedded Signup");
    
    // Redirect to Meta's Embedded Signup flow
    window.location.href = authUrl.toString();
  };

  return { initiateOAuth };
};
