import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Instagram, Facebook, Smartphone, Send, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import whatsappLogo from '@/assets/whatsapp-logo.png';
import { useWhatsAppOAuth } from "@/hooks/useWhatsAppOAuth";

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
  const { initiateOAuth } = useWhatsAppOAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async (channelId: string) => {
    if (channelId === 'whatsapp') {
      try {
        setIsLoading(true);
        await initiateOAuth();
      } catch (error) {
        console.error('Failed to start WhatsApp OAuth:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to start WhatsApp connection');
        setIsLoading(false);
      }
    } else {
      toast.info('Coming soon!', {
        description: `${channelId.charAt(0).toUpperCase() + channelId.slice(1)} integration will be available soon.`,
      });
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
            Connect a messaging channel to start communicating with customers
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
                    disabled={channel.comingSoon || isLoading}
                  >
                    {channel.comingSoon ? "Coming Soon" : "Connect"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
