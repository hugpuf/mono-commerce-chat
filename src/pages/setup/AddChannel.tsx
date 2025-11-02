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

// Removed Facebook SDK - using redirect-based OAuth instead

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

  // Removed Facebook SDK loading - using redirect-based OAuth instead

  const handleConnect = async (channelId: string) => {
    if (channelId === 'whatsapp') {
      if (!metaConfig) {
        toast.error('Meta configuration not loaded. Please refresh the page.');
        return;
      }

      if (!workspaceId) {
        toast.error('Workspace not loaded. Please refresh the page.');
        return;
      }

      setIsConnecting(true);

      try {
        console.log('🚀 Initiating WhatsApp OAuth redirect', {
          workspaceId,
          configId: metaConfig.configId,
          redirectUri: WHATSAPP_REDIRECT_URI
        });

        // Encode workspace ID in state parameter
        const state = btoa(JSON.stringify({ ws: workspaceId }));

        // Construct OAuth URL for redirect flow
        const oauthUrl = 
          `https://www.facebook.com/v24.0/dialog/oauth?` +
          `client_id=${encodeURIComponent(metaConfig.appId)}` +
          `&config_id=${encodeURIComponent(metaConfig.configId)}` +
          `&redirect_uri=${encodeURIComponent(WHATSAPP_REDIRECT_URI)}` +
          `&response_type=code` +
          `&scope=${encodeURIComponent('whatsapp_business_management,whatsapp_business_messaging')}` +
          `&state=${encodeURIComponent(state)}`;

        console.log('🔗 Redirecting to Meta OAuth...');
        
        // Redirect to Meta's OAuth page
        window.location.assign(oauthUrl);
      } catch (error) {
        console.error('❌ Error initiating OAuth redirect:', error);
        toast.error('Failed to launch WhatsApp connection flow');
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
                    disabled={channel.comingSoon || (channel.id === 'whatsapp' && (isLoading || !metaConfig || isConnecting))}
                  >
                    {channel.id === 'whatsapp' && isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
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
