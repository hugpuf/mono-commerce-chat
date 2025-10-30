import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Package, CreditCard, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'pending';
  buttonLabel: string;
  icon: any;
  route: string;
}

interface ConnectionStatus {
  catalog: boolean;
  payment: boolean;
  whatsapp: boolean;
}

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    catalog: false,
    payment: false,
    whatsapp: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConnectionStatus = async () => {
      try {
        // Check catalog sources
        const { data: catalogData } = await supabase
          .from('catalog_sources')
          .select('status')
          .eq('status', 'active')
          .maybeSingle();

        // Check payment providers
        const { data: paymentData } = await supabase
          .from('payment_providers')
          .select('charges_enabled, test_mode')
          .eq('provider', 'stripe')
          .maybeSingle();

        // Check WhatsApp accounts
        const { data: whatsappData } = await supabase
          .from('whatsapp_accounts')
          .select('phone_number_id, webhook_status, business_name')
          .eq('status', 'active')
          .maybeSingle();

        setConnectionStatus({
          catalog: !!catalogData,
          payment: !!(paymentData?.charges_enabled && !paymentData?.test_mode),
          whatsapp: !!(whatsappData?.phone_number_id && whatsappData?.webhook_status === 'verified' && whatsappData?.business_name),
        });
      } catch (error) {
        console.error('Error fetching connection status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConnectionStatus();
  }, []);

  const checklistItems: ChecklistItem[] = [
    {
      id: 'catalog',
      title: 'Add Product Catalog',
      description: 'Connect your Shopify store or upload products',
      status: connectionStatus.catalog ? 'completed' : 'pending',
      buttonLabel: connectionStatus.catalog ? 'Manage' : 'Add Catalog',
      icon: Package,
      route: '/setup/catalog',
    },
    {
      id: 'payment',
      title: 'Setup Payment Processing',
      description: 'Connect Stripe to accept payments',
      status: connectionStatus.payment ? 'completed' : 'pending',
      buttonLabel: connectionStatus.payment ? 'Manage' : 'Connect Stripe',
      icon: CreditCard,
      route: '/setup/payment',
    },
    {
      id: 'whatsapp',
      title: 'Connect Channel',
      description: 'Link your WhatsApp Business Account',
      status: connectionStatus.whatsapp ? 'completed' : 'pending',
      buttonLabel: connectionStatus.whatsapp ? 'Manage' : 'Connect WhatsApp',
      icon: MessageSquare,
      route: '/setup/channel',
    },
  ];

  const completedCount = checklistItems.filter(item => item.status === 'completed').length;
  const totalCount = checklistItems.length;
  const progress = (completedCount / totalCount) * 100;

  const handleAction = (route: string) => {
    navigate(route);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Get Started</h1>
          <p className="text-muted-foreground">Loading your setup status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Get Started</h1>
        <p className="text-muted-foreground">
          Complete these steps to start selling through WhatsApp
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Setup Progress</span>
            <span className="text-muted-foreground">{completedCount} of {totalCount} completed</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </Card>

      <div className="grid gap-4">
        {checklistItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.id} className="p-6">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                    {item.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Button 
                  onClick={() => handleAction(item.route)}
                  variant={item.status === 'completed' ? 'outline' : 'default'}
                >
                  {item.buttonLabel}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
