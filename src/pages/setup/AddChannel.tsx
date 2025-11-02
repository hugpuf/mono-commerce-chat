import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Instagram, Facebook, Smartphone, Send, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import whatsappLogo from '@/assets/whatsapp-logo.png';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
  const { workspaceId } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  
  // Form state
  const [wabaId, setWabaId] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState('');
  const [businessName, setBusinessName] = useState('');

  const handleConnect = (channelId: string) => {
    if (channelId === 'whatsapp') {
      setShowWhatsAppDialog(true);
    } else {
      toast.error('This channel is coming soon');
    }
  };

  const handleWhatsAppSetup = async () => {
    if (!wabaId || !phoneNumberId || !displayPhoneNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!workspaceId) {
      toast.error('Workspace not found');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-manual-setup', {
        body: {
          workspace_id: workspaceId,
          waba_id: wabaId,
          phone_number_id: phoneNumberId,
          display_phone_number: displayPhoneNumber,
          business_name: businessName || undefined,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('WhatsApp connected successfully!');
        setShowWhatsAppDialog(false);
        // Navigate to settings or refresh
        setTimeout(() => navigate('/settings/integrations'), 1500);
      } else {
        toast.error(data?.error || 'Failed to connect WhatsApp');
      }
    } catch (error) {
      console.error('Error connecting WhatsApp:', error);
      toast.error('Failed to connect WhatsApp account');
    } finally {
      setIsLoading(false);
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
              <strong className="text-foreground">Note:</strong> To connect WhatsApp, you'll need your WhatsApp Business Account ID and Phone Number ID from Meta Business Manager.
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

      {/* WhatsApp Setup Dialog */}
      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Connect WhatsApp Business</DialogTitle>
            <DialogDescription>
              Enter your WhatsApp Business Account details from Meta Business Manager.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="waba-id">WhatsApp Business Account ID *</Label>
              <Input
                id="waba-id"
                placeholder="123456789012345"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone-id">Phone Number ID *</Label>
              <Input
                id="phone-id"
                placeholder="987654321098765"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-phone">Display Phone Number *</Label>
              <Input
                id="display-phone"
                placeholder="+1234567890"
                value={displayPhoneNumber}
                onChange={(e) => setDisplayPhoneNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business-name">Business Name (Optional)</Label>
              <Input
                id="business-name"
                placeholder="My Business"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>

            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium mb-2">Where to find these values:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Go to <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta Business Manager</a></li>
                <li>Navigate to Business Settings → WhatsApp Accounts</li>
                <li>Select your WhatsApp Business Account</li>
                <li>Copy the Account ID and Phone Number ID</li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowWhatsAppDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleWhatsAppSetup} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect WhatsApp'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
