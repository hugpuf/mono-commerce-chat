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

  const handleConnect = (channelId: string) => {
    if (channelId === 'whatsapp') {
      if (!metaConfig) {
        toast.error('WhatsApp configuration not available');
        return;
      }

      // Meta Embedded Signup configuration
      const redirectUri = `${window.location.origin}/setup/whatsapp/callback`;
      
      // Encode workspace ID in state so callback can access it even if context isn't ready
      const stateData = { ws: workspaceId, nonce: crypto.randomUUID() };
      const state = btoa(JSON.stringify(stateData));
      console.log('🔐 State prepared:', { hasWorkspace: !!workspaceId });
      
      // Launch Meta's Embedded Signup
      const embedUrl = `https://www.facebook.com/v24.0/dialog/oauth?` +
        `client_id=${metaConfig.appId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `config_id=${metaConfig.configId}&` +
        `response_type=code&` +
        `state=${state}`;
      
      console.log('Opening WhatsApp OAuth:', embedUrl);
      
      // Listen for the Embedded Signup postMessage response
      const messageListener = (event: MessageEvent) => {
        // Verify the message is from Meta (multiple possible origins)
        const allowedOrigins = new Set([
          'https://www.facebook.com',
          'https://web.facebook.com',
          'https://m.facebook.com',
          'https://business.facebook.com',
          'https://facebook.com',
          'https://l.facebook.com',
          window.location.origin,
        ]);
        
        if (!allowedOrigins.has(event.origin)) return;
        
        const message = event.data;
        console.log('📨 Received postMessage:', { origin: event.origin, type: message?.type, event: message?.event });
        
        // Check if it's the WhatsApp Embedded Signup completion message
        if (message?.type === 'WA_EMBEDDED_SIGNUP' && message?.event === 'FINISH') {
          const { phone_number_id, waba_id } = message.data || {};
          
          if (phone_number_id && waba_id) {
            console.log('✅ Captured WABA data:', { phone_number_id, waba_id });
            
            // Store in localStorage to pass to callback page (cross-window accessible)
            localStorage.setItem('whatsapp_waba_data', JSON.stringify({
              phone_number_id,
              waba_id
            }));
            console.log('💾 Stored WABA data to localStorage');
          }
          
          // Clean up listener
          window.removeEventListener('message', messageListener);
        }
      };
      
      window.addEventListener('message', messageListener);
      
      // Try to open in popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        embedUrl,
        'WhatsApp Business Setup',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );

      // Check if popup was blocked
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Popup was blocked, show toast and redirect in same window
        toastHook({
          title: "Popup Blocked",
          description: "Opening WhatsApp setup in this window...",
        });
        
        // Clean up listener if popup was blocked
        window.removeEventListener('message', messageListener);
        
        setTimeout(() => {
          window.location.href = embedUrl;
        }, 1500);
      } else {
        // Popup opened successfully, monitor it
        const checkPopup = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkPopup);
            console.log('Popup closed - refreshing connection status');
            window.removeEventListener('message', messageListener);
            // Reload the page to refresh connection status
            window.location.reload();
          }
        }, 500);
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
                    disabled={channel.comingSoon || (channel.id === 'whatsapp' && (isLoading || !metaConfig))}
                  >
                    {channel.id === 'whatsapp' && isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
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
