import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function WhatsAppCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { workspaceId, isLoading: workspaceLoading } = useWorkspace();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing WhatsApp connection...');

  useEffect(() => {
    const readWabaData = () => {
      const value = localStorage.getItem('whatsapp_waba_data') || sessionStorage.getItem('whatsapp_waba_data');
      return value ? JSON.parse(value) : null;
    };

    const waitForWabaData = (timeoutMs = 8000): Promise<any> => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          window.removeEventListener('storage', onStorage);
          resolve(null);
        }, timeoutMs);

        const onStorage = (e: StorageEvent) => {
          if (e.key === 'whatsapp_waba_data' && e.newValue) {
            clearTimeout(timeout);
            window.removeEventListener('storage', onStorage);
            resolve(JSON.parse(e.newValue));
          }
        };

        window.addEventListener('storage', onStorage);
      });
    };

    const processCallback = async () => {
      try {
        // Get OAuth code from URL params
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        
        console.log('🔍 Callback params:', { hasCode: !!code, hasState: !!state });
        
        if (!code) {
          throw new Error('No authorization code received');
        }

        // Parse workspace ID from state parameter (fallback chain)
        let effectiveWorkspaceId: string | null = null;
        let workspaceSource = 'none';
        
        // Try 1: Parse from state parameter
        if (state) {
          try {
            const stateData = JSON.parse(atob(state));
            if (stateData.ws) {
              effectiveWorkspaceId = stateData.ws;
              workspaceSource = 'state';
              console.log('✅ Workspace from state parameter');
            }
          } catch (e) {
            console.log('⚠️ Could not parse state parameter');
          }
        }
        
        // Try 2: Use workspace from context
        if (!effectiveWorkspaceId && workspaceId) {
          effectiveWorkspaceId = workspaceId;
          workspaceSource = 'context';
          console.log('✅ Workspace from context');
        }
        
        // Try 3: Fetch directly from database
        if (!effectiveWorkspaceId) {
          console.log('⏳ Fetching workspace from database...');
          setMessage('Waiting for workspace...');
          
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('workspace_id')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (profile?.workspace_id) {
              effectiveWorkspaceId = profile.workspace_id;
              workspaceSource = 'database';
              console.log('✅ Workspace from database');
            }
          }
        }
        
        // Final check
        if (!effectiveWorkspaceId) {
          throw new Error('Could not determine workspace. Please try again from the channel setup page.');
        }
        
        console.log('📊 Workspace resolution:', { source: workspaceSource, id: effectiveWorkspaceId?.substring(0, 8) + '...' });
        setMessage('Processing WhatsApp connection...');
        
        // Get WABA data from localStorage first, fallback to sessionStorage
        let wabaData = readWabaData();
        
        if (!wabaData) {
          console.log('⏳ WABA data not immediately available, waiting for storage event...');
          wabaData = await waitForWabaData();
        }
        
        if (wabaData) {
          console.log('✅ Retrieved WABA data:', wabaData);
          // Clear from both storages
          localStorage.removeItem('whatsapp_waba_data');
          sessionStorage.removeItem('whatsapp_waba_data');
        } else {
          console.warn('⚠️ No WABA data found after waiting');
        }
        
        console.log('🚀 Invoking whatsapp-oauth-callback with:', {
          has_code: !!code,
          has_workspace_id: !!effectiveWorkspaceId,
          has_waba_id: !!wabaData?.waba_id,
          has_phone_number_id: !!wabaData?.phone_number_id
        });
        
        // Send code and WABA data to edge function
        const { data, error } = await supabase.functions.invoke('whatsapp-oauth-callback', {
          body: {
            code,
            state,
            workspace_id: effectiveWorkspaceId,
            redirect_uri: `${window.location.origin}/setup/whatsapp/callback`,
            waba_id: wabaData?.waba_id,
            phone_number_id: wabaData?.phone_number_id
          }
        });

        if (error) throw error;

        console.log('✅ WhatsApp connected successfully');
        setStatus('success');
        setMessage('WhatsApp connected successfully!');
        
        // Redirect after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);

      } catch (error) {
        console.error('❌ Error processing WhatsApp callback:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Failed to connect WhatsApp');
        
        // Redirect back after 3 seconds
        setTimeout(() => {
          navigate('/setup/channel');
        }, 3000);
      }
    };

    processCallback();
  }, [searchParams, navigate, workspaceId, workspaceLoading]);

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