import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Package, CreditCard, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceConnections } from "@/hooks/useWorkspaceConnections";

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
  const { workspaceId } = useWorkspace();
  const { data: connections, isLoading: loading } = useWorkspaceConnections(workspaceId);

  const connectionStatus = {
    catalog: !!connections?.catalogSource,
    payment: !!connections?.paymentProvider,
    whatsapp: !!connections?.whatsappAccount,
  };

  const checklistItems: ChecklistItem[] = [
    {
      id: 'whatsapp',
      title: 'Connect Channel',
      description: 'Link your business messaging channel',
      status: connectionStatus.whatsapp ? 'completed' : 'pending',
      buttonLabel: connectionStatus.whatsapp ? 'Manage' : 'Connect Channel',
      icon: MessageSquare,
      route: '/setup/channel',
    },
    {
      id: 'catalog',
      title: 'Add Product Catalog',
      description: 'Connect your product catalog or upload items',
      status: connectionStatus.catalog ? 'completed' : 'pending',
      buttonLabel: connectionStatus.catalog ? 'Manage' : 'Add Catalog',
      icon: Package,
      route: '/setup/catalog',
    },
    {
      id: 'payment',
      title: 'Setup Payment Processing',
      description: 'Connect a payment provider to accept payments',
      status: connectionStatus.payment ? 'completed' : 'pending',
      buttonLabel: connectionStatus.payment ? 'Manage' : 'Link Payment',
      icon: CreditCard,
      route: '/setup/payment',
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
      <div className="max-w-4xl mx-auto p-6 pt-20 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Get Started</h1>
          <p className="text-muted-foreground">Loading your setup status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 pt-20 space-y-6">
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
