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
        // ========== CALLBACK PAGE ENTRY LOGGING (DEBUG MODE) ==========
        if (import.meta.env.VITE_DEBUG_WA_ES === 'true') {
          console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.info('📥 CALLBACK PAGE LOADED');
          console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.info('🌐 CALLBACK URL:', window.location.href);
          console.info('📋 CALLBACK PARAMS:');
          const allParams = new URLSearchParams(window.location.search);
          allParams.forEach((value, key) => {
            if (key === 'setup') {
              console.info(`   • ${key}: [length=${value.length}] ${value.substring(0, 200)}${value.length > 200 ? '...' : ''}`);
            } else if (key === 'code') {
              console.info(`   • ${key}: ***REDACTED*** (length=${value.length})`);
            } else {
              console.info(`   • ${key}:`, value);
            }
          });
          console.info('⏰ Timestamp:', new Date().toISOString());
          console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }
        
        // Get OAuth code and setup from URL params
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const setupParam = searchParams.get('setup');
        
        // ========== SETUP PARSING WITH HARDENING ==========
        let setupData = null;
        if (setupParam) {
          // Try parsing without decoding first (URLSearchParams already decodes)
          try {
            setupData = JSON.parse(setupParam);
            
            if (import.meta.env.VITE_DEBUG_WA_ES === 'true') {
              console.info('✅ Setup data parsed successfully');
              console.info('📦 Setup data keys:', Object.keys(setupData));
              
              const wabaId = setupData.waba_id || setupData.data?.waba_id;
              const phoneId = setupData.phone_number_id || setupData.data?.phone_number_id;
              const displayPhone = setupData.displayPhoneNumber || setupData.data?.displayPhoneNumber;
              
              console.info('📦 WABA ID:', wabaId || 'NOT FOUND');
              console.info('📦 Phone ID:', phoneId || 'NOT FOUND');
              console.info('📦 Display Phone:', displayPhone || 'NOT FOUND');
            }
          } catch (e1) {
            // Fallback: try with explicit decoding
            try {
              setupData = JSON.parse(decodeURIComponent(setupParam));
              
              if (import.meta.env.VITE_DEBUG_WA_ES === 'true') {
                console.info('✅ Setup data parsed (with decodeURIComponent)');
                console.info('📦 Setup data keys:', Object.keys(setupData));
              }
            } catch (e2) {
              console.error('❌ WA_ES: Failed to parse setup parameter');
              console.error('Setup param length:', setupParam.length);
              console.error('Parse error:', e2 instanceof Error ? e2.message : e2);
            }
          }
        }
        
        // Structured error logging if setup is missing
        if (!setupData) {
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('❌ WA_ES_MISSING_SETUP');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('🔍 Current callback URL:', window.location.href);
          console.error('📋 Received params:', Array.from(searchParams.entries()).map(([k, v]) => k === 'code' ? [k, '***REDACTED***'] : [k, v]));
          console.error('');
          console.error('🔍 DIAGNOSTIC CHECKLIST:');
          console.error('   □ Using correct endpoint? (whatsapp_business_embedded_signup)');
          console.error('   □ Is config_id correct in launch URL?');
          console.error('   □ Did Meta show full Embedded Signup screens (business, phone)?');
          console.error('   □ Is test user added to App Roles in Meta Dashboard?');
          console.error('   □ Does redirect_uri exactly match Meta configuration?');
          console.error('   □ Did user complete all ES steps (business + phone selection)?');
          console.error('   □ Is the Embedded Signup Configuration "Published" in Meta Dashboard?');
          console.error('');
          console.error('Expected: ?code=...&state=...&setup=<json>');
          console.error('Actual:', window.location.search);
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }
        
        console.log('🔍 Callback params summary:', { hasCode: !!code, hasState: !!state, hasSetupData: !!setupData });
        
        if (!code && !setupData) {
          throw new Error('Neither code nor setup data received from WhatsApp');
        }
        
        if (!code && setupData) {
          console.log('⚠️ No code but setup_data present - using Embedded Signup direct flow');
        }

        // Parse workspace ID and redirect_uri from state parameter (fallback chain)
        // NOTE: workspace_id is now stored in oauth_states table, not in state parameter
        let effectiveWorkspaceId: string | null = null;
        let workspaceSource = 'none';
        
        // Try 1: Use workspace from context
        if (workspaceId) {
          effectiveWorkspaceId = workspaceId;
          workspaceSource = 'context';
          console.log('✅ Workspace from context');
        }
        
        // Try 2: Fetch directly from database
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
        
        // Final check - workspace_id will be resolved from oauth_states in edge function
        // We send what we have, the edge function will use its stored value as the source of truth
        console.log('📊 Workspace resolution:', { source: workspaceSource, id: effectiveWorkspaceId?.substring(0, 8) + '...' });
        setMessage('Connecting WhatsApp account...');
        
        // ========== PRE-BACKEND-CALL LOGGING ==========
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🚀 INVOKING BACKEND - Data Being Sent');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📤 Sending to whatsapp-oauth-callback:');
        console.log('   • has_code:', !!code);
        console.log('   • has_state:', !!state);
        console.log('   • has_workspace_id:', !!effectiveWorkspaceId);
        console.log('   • has_setup_data:', !!setupData);
        if (setupData) {
          console.log('   • setup_data keys:', Object.keys(setupData));
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Send code and setup data to edge function
        // Note: workspace_id is optional here, edge function will use value from oauth_states table
        const { data, error } = await supabase.functions.invoke('whatsapp-oauth-callback', {
          body: {
            code,
            state,
            redirect_uri: WHATSAPP_REDIRECT_URI,
            workspace_id: effectiveWorkspaceId,  // Optional, DB value takes precedence
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
        
        // If in popup, notify opener and close
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'WA_CONNECT_SUCCESS' }, window.location.origin);
          setTimeout(() => {
            window.close();
          }, 1000);
        } else {
          // If not popup, redirect after 2 seconds
          setTimeout(() => {
            navigate('/');
          }, 2000);
        }

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