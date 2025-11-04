import { useEffect, useState, useRef } from "react";
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
  const hasRunRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate invocation
    if (hasRunRef.current) return;
    if (workspaceLoading) return;
    
    hasRunRef.current = true;
    
    const initiateAction = searchParams.get('action');
    const hasAuthCode = searchParams.has('code');
    const hasStateParam = searchParams.has('state');
    const hasSetupParam = searchParams.has('setup');

    // If action=initiate and we do not yet have any callback parameters, trigger OAuth from this page
    if (initiateAction === 'initiate' && !hasAuthCode && !hasStateParam && !hasSetupParam) {
      import('@/components/WhatsAppOAuthInitiator').then(module => {
        const initiator = module.default;
        initiator();
      });
      return;
    }

    // If we arrive with callback parameters but the ?action=initiate flag is still present, clean it up to avoid re-triggering
    if (initiateAction === 'initiate' && (hasAuthCode || hasStateParam || hasSetupParam)) {
      try {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('action');
        window.history.replaceState(null, '', currentUrl.toString());
      } catch (error) {
        console.warn('Failed to clean WhatsApp callback URL parameters:', error);
      }
    }
    
    const processCallback = async () => {
      try {
        // ========== CALLBACK PAGE ENTRY LOGGING ==========
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📥 CALLBACK PAGE LOADED - Raw URL Analysis');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🌐 Complete URL:', window.location.href);
        console.log('📋 All Query Parameters:');
        const allParams = new URLSearchParams(window.location.search);
        allParams.forEach((value, key) => {
          if (key === 'setup') {
            console.log(`   • ${key}: [length=${value.length}] ${value.substring(0, 200)}${value.length > 200 ? '...' : ''}`);
          } else {
            console.log(`   • ${key}:`, value);
          }
        });
        console.log('⏰ Callback timestamp:', new Date().toISOString());
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Get OAuth code and setup from URL params
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const setupParam = searchParams.get('setup');
        
        // ========== SETUP PARSING LOGGING ==========
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 SETUP PARAMETER PARSING');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        let setupData = null;
        
        // First check sessionStorage (from postMessage event listener)
        const sessionSetup = sessionStorage.getItem('wa_setup_data');
        if (sessionSetup) {
          console.log('✅ Found setup data in sessionStorage (from postMessage)');
          try {
            const eventData = JSON.parse(sessionSetup);
            console.log('   • Event type:', eventData.event);
            console.log('   • Event data:', eventData.data);
            
            // Extract the actual setup data based on Meta's structure
            if (eventData.type === 'WA_EMBEDDED_SIGNUP') {
              if (eventData.event === 'FINISH' || eventData.event === 'FINISH_ONLY_WABA' || eventData.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
                setupData = {
                  phone_number_id: eventData.data?.phone_number_id,
                  waba_id: eventData.data?.waba_id,
                  business_id: eventData.data?.business_id,
                  ad_account_ids: eventData.data?.ad_account_ids,
                  page_ids: eventData.data?.page_ids,
                  dataset_ids: eventData.data?.dataset_ids,
                  event: eventData.event
                };
                console.log('   • Parsed setup data:', setupData);
              }
            }
            
            sessionStorage.removeItem('wa_setup_data'); // Clean up
          } catch (e) {
            console.error('❌ Failed to parse sessionStorage setup data:', e);
          }
        }
        
        // Check for flow events (cancellation/errors)
        const flowEvent = sessionStorage.getItem('wa_flow_event');
        if (flowEvent) {
          console.log('⚠️ Found flow event in sessionStorage');
          try {
            const eventData = JSON.parse(flowEvent);
            console.log('   • Event:', eventData.event);
            console.log('   • Data:', eventData.data);
            sessionStorage.removeItem('wa_flow_event'); // Clean up
            
            // If it's a cancellation or error, don't proceed
            if (eventData.event === 'CANCEL') {
              throw new Error(eventData.data?.error_message || 'WhatsApp signup was cancelled');
            }
          } catch (e) {
            console.error('❌ Flow event error:', e);
          }
        }
        
        // Fallback: check URL param (legacy support)
        if (!setupData && setupParam) {
          console.log('✓ setup parameter in URL (legacy)');
          console.log('   • Raw value length:', setupParam.length);
          
          try {
            const urlSetupData = JSON.parse(setupParam);
            console.log('✅ Parse SUCCESS (direct JSON.parse)');
            
            // Check if it's already in Meta's structure or raw data
            if (urlSetupData.type === 'WA_EMBEDDED_SIGNUP') {
              setupData = {
                phone_number_id: urlSetupData.data?.phone_number_id,
                waba_id: urlSetupData.data?.waba_id,
                business_id: urlSetupData.data?.business_id,
                event: urlSetupData.event
              };
            } else {
              // Legacy format - use as-is
              setupData = urlSetupData;
            }
            console.log('   • Parsed setup data:', setupData);
          } catch (e1) {
            console.warn('⚠️ Direct JSON.parse failed:', e1 instanceof Error ? e1.message : e1);
            
            try {
              const urlSetupData = JSON.parse(decodeURIComponent(setupParam));
              console.log('✅ Parse SUCCESS (with decodeURIComponent)');
              setupData = urlSetupData;
            } catch (e2) {
              console.error('❌ Both parsing attempts failed');
            }
          }
        }
        
        if (setupData) {
          console.log('📦 Final setup_data keys:', Object.keys(setupData));
        } else {
          console.warn('⚠️ No setup data found');
          console.log('🔍 This may be expected if using code exchange without embedded signup data');
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        console.log('🔍 Callback params summary:', { hasCode: !!code, hasState: !!state, hasSetupData: !!setupData });
        
        if (!code && !setupData) {
          throw new Error('Neither code nor setup data received from WhatsApp');
        }
        
        if (!code && setupData) {
          console.log('⚠️ No code but setup_data present - using Embedded Signup direct flow');
        }

        // Parse workspace ID from state parameter (fallback chain)
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
