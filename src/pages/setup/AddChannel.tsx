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
        options: { config_id: string; response_type: string; override_default_response_type: boolean; extras: Record<string, unknown> }
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
    if (!metaConfig) return;

    // Check if SDK is already loaded
    if (window.FB) {
      setFbSdkLoaded(true);
      return;
    }

    // Load Facebook SDK script
    window.fbAsyncInit = function() {
      window.FB!.init({
        appId: metaConfig.appId,
        version: 'v24.0'
      });
      setFbSdkLoaded(true);
      console.log('✅ Facebook SDK initialized');
    };

    // Insert SDK script
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src*="facebook.net/en_US/sdk.js"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, [metaConfig]);

  const handleConnect = async (channelId: string) => {
    if (channelId === 'whatsapp') {
      if (!metaConfig || !fbSdkLoaded || !window.FB) {
        toast.error('WhatsApp configuration not ready. Please wait...');
        return;
      }

      if (!workspaceId) {
        toast.error('No workspace selected');
        return;
      }

      setIsConnecting(true);
      console.log('🚀 Initiating WhatsApp connection via Facebook SDK');

      try {
        // Use Facebook SDK to launch Embedded Signup
        window.FB.login(
          async (response) => {
            console.log('📱 FB.login response:', response);

            if (response.status === 'connected' && response.authResponse?.code) {
              const { code } = response.authResponse;
              const setupData = response.setup;

              console.log('✅ OAuth successful:', {
                hasCode: !!code,
                hasSetupData: !!setupData,
                wabaId: setupData?.waba_id,
                phoneNumberId: setupData?.phone_number_id
              });

              // Show processing toast
              toast.loading('Connecting WhatsApp account...', { id: 'whatsapp-connection' });

              try {
                // Call edge function with the code and setup data
                const { data, error } = await supabase.functions.invoke('whatsapp-oauth-callback', {
                  body: {
                    code,
                    workspace_id: workspaceId,
                    redirect_uri: WHATSAPP_REDIRECT_URI,
                    state: btoa(JSON.stringify({ ws: workspaceId })),
                    setup_data: setupData ? {
                      waba_id: setupData.waba_id,
                      phone_number_id: setupData.phone_number_id,
                      business_id: setupData.business_id
                    } : undefined
                  }
                });

                if (error) {
                  throw error;
                }

                console.log('✅ WhatsApp connection successful:', data);
                toast.success('WhatsApp connected successfully!', { id: 'whatsapp-connection' });
                
                // Navigate to success page or back
                setTimeout(() => {
                  navigate('/settings/integrations');
                }, 1000);

              } catch (error) {
                console.error('❌ Failed to complete WhatsApp connection:', error);
                toast.error('Failed to connect WhatsApp. Please try again.', { id: 'whatsapp-connection' });
              }
            } else {
              console.warn('⚠️ OAuth was cancelled or failed:', response);
              toast.error('WhatsApp connection was cancelled');
            }

            setIsConnecting(false);
          },
          {
            config_id: metaConfig.configId,
            response_type: 'code',
            override_default_response_type: true,
            extras: {
              setup: {
                business: {
                  phone_numbers: ['123']
                }
              }
            }
          }
        );
      } catch (error) {
        console.error('❌ Error launching FB.login:', error);
        toast.error('Failed to start WhatsApp connection');
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
                    {channel.id === 'whatsapp' && (isLoading || !fbSdkLoaded) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading SDK...
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
