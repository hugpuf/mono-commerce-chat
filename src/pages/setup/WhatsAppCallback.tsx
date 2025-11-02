import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { WHATSAPP_REDIRECT_URI } from '@/lib/constants';

export default function WhatsAppCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { workspaceId, isLoading: workspaceLoading } = useWorkspace();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing WhatsApp connection...');
  const hasRunRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate invocation
    if (hasRunRef.current) return;
    if (workspaceLoading) return;
    
    hasRunRef.current = true;
    
    const processCallback = async () => {
      try {
        // Get OAuth code from URL params
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        
        // Meta returns setup data in the URL hash fragment, not query params
        // Example: #setup={"data":...}
        let setupData = null;
        const hash = window.location.hash;
        if (hash.includes('setup=')) {
          try {
            const setupMatch = hash.match(/setup=([^&]+)/);
            if (setupMatch) {
              const setupString = decodeURIComponent(setupMatch[1]);
              setupData = JSON.parse(setupString);
              console.log('✅ Parsed setup data from hash fragment:', setupData);
            }
          } catch (e) {
            console.error('⚠️ Failed to parse setup data from hash:', e);
          }
        }
        
        console.log('🔍 Callback params:', { hasCode: !!code, hasState: !!state, hasSetupData: !!setupData });
        
        if (!code) {
          throw new Error('No authorization code received');
        }

        // Parse workspace ID and redirect_uri from state parameter (fallback chain)
        let effectiveWorkspaceId: string | null = null;
        let redirectUri: string | null = null;
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
            if (stateData.redirect_uri) {
              redirectUri = stateData.redirect_uri;
              console.log('🔗 Using redirect_uri from state:', redirectUri);
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
        setMessage('Connecting WhatsApp account...');
        
        // Use redirect_uri from state (byte-for-byte identical to OAuth start) or fallback to constant
        const finalRedirectUri = redirectUri || WHATSAPP_REDIRECT_URI;
        console.log('🔍 Using redirect_uri for token exchange:', finalRedirectUri);
        
        console.log('🚀 Invoking whatsapp-oauth-callback with:', {
          has_code: !!code,
          has_workspace_id: !!effectiveWorkspaceId,
          redirect_uri: finalRedirectUri
        });
        
        // Send code and setup data to edge function
        const { data, error } = await supabase.functions.invoke('whatsapp-oauth-callback', {
          body: {
            code,
            state,
            workspace_id: effectiveWorkspaceId,
            redirect_uri: finalRedirectUri,  // Use exact URI from OAuth start
            setup_data: setupData
          }
        });

        if (error) {
          // Try to extract detailed error message
          let errorMessage = 'Failed to connect WhatsApp. Please try again.';
          
          // Check for specific error codes
          const errorStr = error.message || JSON.stringify(error);
          if (errorStr.includes('409') || errorStr.includes('CODE_ALREADY_USED')) {
            errorMessage = 'This connection attempt has expired. Please start the process again.';
          } else if (errorStr.includes('400')) {
            // Extract the actual error message from the response
            try {
              const match = errorStr.match(/"error":"([^"]+)"/);
              if (match) errorMessage = match[1];
            } catch {}
          } else if (errorStr.includes('business_management')) {
            errorMessage = 'Missing required permissions. Please ensure you complete all steps in the Meta signup flow.';
          }
          
          setStatus('error');
          setMessage(errorMessage);
          
          // Redirect back after delay
          setTimeout(() => navigate('/setup/add-channel'), 3000);
          return;
        }

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