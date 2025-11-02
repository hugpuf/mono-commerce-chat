import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Instagram, Facebook, Smartphone, Send, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import whatsappLogo from '@/assets/whatsapp-logo.png';
import { WHATSAPP_REDIRECT_URI } from '@/lib/constants';

// Declare Facebook SDK types
declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (params: { appId: string; version: string }) => void;
      login: (
        callback: (response: {
          status: string;
          authResponse?: {
            code: string;
            accessToken?: string;
          };
          setup?: {
            waba_id: string;
            phone_number_id: string;
            business_id?: string;
          };
        }) => void,
        options: { 
          config_id: string; 
          response_type: string; 
          override_default_response_type: boolean;
          scope?: string;
          extras: Record<string, unknown>;
        }
      ) => void;
    };
  }
}

interface ChannelProvider {
  id: string;
  name: string;
  icon: typeof MessageCircle | string;
  description: string;
  comingSoon?: boolean;
}

const channelProviders: ChannelProvider[] = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    icon: whatsappLogo,
    description: "Official WhatsApp Business API",
  },
  {
    id: "instagram",
    name: "Instagram Direct",
    icon: Instagram,
    description: "Instagram messaging",
    comingSoon: true,
  },
  {
    id: "messenger",
    name: "Facebook Messenger",
    icon: Facebook,
    description: "Facebook messaging platform",
    comingSoon: true,
  },
  {
    id: "sms",
    name: "SMS",
    icon: Smartphone,
    description: "Text message channel",
    comingSoon: true,
  },
  {
    id: "telegram",
    name: "Telegram",
    icon: Send,
    description: "Telegram messaging",
    comingSoon: true,
  },
];

export default function AddChannel() {
  const navigate = useNavigate();
  const { toast: toastHook } = useToast();
  const { workspaceId } = useWorkspace();
  const [metaConfig, setMetaConfig] = useState<{ appId: string; configId: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [fbSdkLoaded, setFbSdkLoaded] = useState(false);

  useEffect(() => {
    const fetchMetaConfig = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-meta-config');
        
        if (error) throw error;
        
        if (data?.appId && data?.configId) {
          setMetaConfig(data);
        } else {
          toast.error('Meta App credentials not configured. Please contact support.');
        }
      } catch (error) {
        console.error('Error fetching Meta config:', error);
        toast.error('Failed to load WhatsApp configuration');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetaConfig();
  }, []);

  // Load Facebook SDK
  useEffect(() => {
    if (!metaConfig) {
      console.log('⏳ Waiting for Meta config...');
      return;
    }

    console.log('📱 Meta config loaded:', { 
      appId: metaConfig.appId, 
      configId: metaConfig.configId 
    });

    // Check if SDK is already loaded
    if (window.FB) {
      console.log('✅ Facebook SDK already loaded');
      setFbSdkLoaded(true);
      return;
    }

    console.log('📥 Loading Facebook SDK...');
    
    // Load Facebook SDK script
    window.fbAsyncInit = function() {
      console.log('🔧 Initializing Facebook SDK with App ID:', metaConfig.appId);
      window.FB!.init({
        appId: metaConfig.appId,
        version: 'v24.0'
      });
      setFbSdkLoaded(true);
      console.log('✅ Facebook SDK initialized successfully');
    };

    // Insert SDK script
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    
    script.onerror = () => {
      console.error('❌ Failed to load Facebook SDK script');
      toast.error('Failed to load Facebook SDK');
    };
    
    script.onload = () => {
      console.log('📦 Facebook SDK script loaded');
    };
    
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src*="facebook.net/en_US/sdk.js"]');
      if (existingScript) {
        console.log('🧹 Cleaning up Facebook SDK script');
        document.body.removeChild(existingScript);
      }
    };
  }, [metaConfig]);

  const handleConnect = async (channelId: string) => {
    if (channelId === 'whatsapp') {
      console.log('🔍 WhatsApp connection check:', {
        hasMetaConfig: !!metaConfig,
        fbSdkLoaded,
        hasFBObject: !!window.FB,
        hasWorkspaceId: !!workspaceId
      });

      if (!metaConfig || !fbSdkLoaded || !window.FB) {
        console.error('❌ Prerequisites not met for WhatsApp connection');
        toast.error('WhatsApp configuration not ready. Please wait...');
        return;
      }

      if (!workspaceId) {
        console.error('❌ No workspace ID available');
        toast.error('No workspace selected');
        return;
      }

      setIsConnecting(true);
      console.log('🚀 Initiating WhatsApp connection via Facebook SDK', {
        workspaceId,
        configId: metaConfig.configId,
        redirectUri: WHATSAPP_REDIRECT_URI
      });

      try {
        // Use Facebook SDK to launch Embedded Signup
        console.log('📞 Calling FB.login with config_id:', metaConfig.configId);
        
        // Important: FB.login for embedded signup doesn't return setup_data in response
        // The setup data comes through the redirect URL as query parameters
        // So we need to handle this differently
        
        window.FB.login(
          async (response) => {
            console.log('📱 FB.login response received:', {
              status: response.status,
              hasAuthResponse: !!response.authResponse,
              hasCode: !!response.authResponse?.code,
              hasSetup: !!response.setup,
              fullResponse: JSON.stringify(response, null, 2)
            });

            if (response.status === 'connected' && response.authResponse?.code) {
              const { code } = response.authResponse;
              
              // NOTE: Setup data is NOT in response.setup for embedded signup
              // It should be passed via URL redirect, but since we're using SDK popup,
              // we won't get it here. The backend will need to fetch it.
              console.log('✅ OAuth successful - received authorization code');

              // Show processing toast
              toast.loading('Connecting WhatsApp account...', { id: 'whatsapp-connection' });

              try {
                const payload = {
                  code,
                  workspace_id: workspaceId,
                  redirect_uri: WHATSAPP_REDIRECT_URI,
                  state: btoa(JSON.stringify({ ws: workspaceId }))
                  // No setup_data - backend will fetch via API
                };

                console.log('📤 Invoking edge function with payload:', {
                  hasCode: !!payload.code,
                  workspaceId: payload.workspace_id,
                  redirectUri: payload.redirect_uri
                });

                // Call edge function with the code
                const { data, error } = await supabase.functions.invoke('whatsapp-oauth-callback', {
                  body: payload
                });

                console.log('📥 Edge function response:', {
                  hasData: !!data,
                  hasError: !!error,
                  data: data ? JSON.stringify(data, null, 2) : null,
                  error: error ? JSON.stringify(error, null, 2) : null
                });

                if (error) {
                  console.error('❌ Edge function returned error:', error);
                  throw error;
                }

                console.log('✅ WhatsApp connection successful:', data);
                toast.success('WhatsApp connected successfully!', { id: 'whatsapp-connection' });
                
                // Navigate to success page or back
                setTimeout(() => {
                  console.log('🔄 Navigating to integrations page');
                  navigate('/settings/integrations');
                }, 1000);

              } catch (error) {
                console.error('❌ Failed to complete WhatsApp connection:', {
                  error,
                  errorMessage: error instanceof Error ? error.message : 'Unknown error',
                  errorStack: error instanceof Error ? error.stack : undefined
                });
                
                const errorMessage = error instanceof Error && error.message 
                  ? error.message 
                  : 'Failed to connect WhatsApp. Please try again.';
                  
                toast.error(errorMessage, { id: 'whatsapp-connection' });
              }
            } else if (response.status === 'unknown') {
              console.warn('⚠️ OAuth was cancelled by user or popup was blocked');
              toast.error('WhatsApp connection was cancelled or popup was blocked');
            } else {
              console.warn('⚠️ OAuth returned unexpected status:', {
                status: response.status,
                response: JSON.stringify(response, null, 2)
              });
              toast.error('Unable to connect WhatsApp. Please try again.');
            }

            setIsConnecting(false);
          },
          {
            config_id: metaConfig.configId,
            response_type: 'code',
            override_default_response_type: true,
            scope: 'whatsapp_business_management,whatsapp_business_messaging',
            extras: {
              setup: {}
            }
          }
        );
        
        console.log('✅ FB.login initiated successfully');
      } catch (error) {
        console.error('❌ Error launching FB.login:', {
          error,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined,
          fbAvailable: !!window.FB,
          fbSdkLoaded
        });
        
        toast.error('Failed to start WhatsApp connection. Please refresh and try again.');
        setIsConnecting(false);
      }
    } else {
      toast.error('This channel is coming soon');
    }
  };

  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">Add Messaging Channel</h1>
          <p className="text-muted-foreground">
            Provision an official messaging channel for customer communications
          </p>
          
          <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> To connect WhatsApp, you'll need a Meta Business account and a configured Meta App. 
              The connection uses Meta's Embedded Signup for a seamless one-click experience.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {channelProviders.map((channel) => {
            const Icon = typeof channel.icon !== 'string' ? channel.icon : null;
            return (
              <Card
                key={channel.id}
                className={`
                  border-border hover:border-foreground/20 transition-all duration-200
                  ${channel.comingSoon ? "opacity-60" : ""}
                `}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center bg-muted overflow-hidden">
                      {typeof channel.icon === 'string' ? (
                        <img src={channel.icon} alt={channel.name} className="w-full h-full object-contain p-0" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {channel.name}
                        {channel.comingSoon && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            Soon
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {channel.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleConnect(channel.id)}
                    disabled={channel.comingSoon || (channel.id === 'whatsapp' && (isLoading || !metaConfig || !fbSdkLoaded || isConnecting))}
                  >
                    {channel.id === 'whatsapp' && isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Initializing...
                      </>
                    ) : channel.id === 'whatsapp' && !fbSdkLoaded ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Preparing...
                      </>
                    ) : channel.id === 'whatsapp' && isConnecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : channel.comingSoon ? (
                      "Coming Soon"
                    ) : channel.id === 'whatsapp' ? (
                      "Connect via Meta"
                    ) : (
                      "Provision"
                    )}
                  </Button>
                  {channel.id === 'whatsapp' && !channel.comingSoon && (
                    <p className="text-[10px] text-muted-foreground mt-2 text-center">
                      One-click setup with Meta
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
