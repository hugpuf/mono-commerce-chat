import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function WhatsAppCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { workspaceId } = useWorkspace();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing WhatsApp connection...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get OAuth code from URL params
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        
        if (!code) {
          throw new Error('No authorization code received');
        }

        if (!workspaceId) {
          throw new Error('No workspace found');
        }
        
        // Get WABA data from sessionStorage (set by AddChannel page via postMessage)
        const wabaDataStr = sessionStorage.getItem('whatsapp_waba_data');
        let wabaData = null;
        
        if (wabaDataStr) {
          try {
            wabaData = JSON.parse(wabaDataStr);
            console.log('Retrieved WABA data from sessionStorage:', wabaData);
            // Clear the data after retrieval
            sessionStorage.removeItem('whatsapp_waba_data');
          } catch (e) {
            console.warn('Failed to parse WABA data from sessionStorage:', e);
          }
        }
        
        // Send code and WABA data to edge function
        const { data, error } = await supabase.functions.invoke('whatsapp-oauth-callback', {
          body: {
            code,
            state,
            workspace_id: workspaceId,
            redirect_uri: `${window.location.origin}/setup/whatsapp/callback`,
            waba_id: wabaData?.waba_id,
            phone_number_id: wabaData?.phone_number_id
          }
        });

        if (error) throw error;

        setStatus('success');
        setMessage('WhatsApp connected successfully!');
        
        // Redirect after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);

      } catch (error) {
        console.error('Error processing WhatsApp callback:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Failed to connect WhatsApp');
        
        // Redirect back after 3 seconds
        setTimeout(() => {
          navigate('/setup/add-channel');
        }, 3000);
      }
    };

    processCallback();
  }, [searchParams, navigate, workspaceId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === 'processing' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-lg">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <p className="text-lg font-medium">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <p className="text-lg font-medium">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecting back...</p>
          </>
        )}
      </div>
    </div>
  );
}