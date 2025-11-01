import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ShoppingBag,
  CreditCard,
  MessageCircle,
  FileText,
  Zap,
  ShoppingCart,
  BarChart3,
  Plus,
  Camera,
} from "lucide-react";
import { IntegrationCircle } from "./IntegrationCircle";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import logo from '@/assets/logo.png';

const mainNavItems = [
  { path: "/conversations", label: "Conversations", icon: MessageCircle },
  { path: "/templates", label: "Templates", icon: FileText },
  { path: "/automations", label: "Automations", icon: Zap },
  { path: "/orders", label: "Orders", icon: ShoppingCart },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/catalog", label: "Catalog", icon: ShoppingBag },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const { workspace, workspaceId } = useWorkspace();
  const [catalogSource, setCatalogSource] = useState<any>(null);
  const [paymentProvider, setPaymentProvider] = useState<any>(null);
  const [whatsappAccount, setWhatsappAccount] = useState<any>(null);

  useEffect(() => {
    if (workspaceId) {
      fetchIntegrations();
    }
  }, [workspaceId]);

  const fetchIntegrations = async () => {
    try {
      // Fetch catalog source
      const { data: catalog } = await supabase
        .from("catalog_sources")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .maybeSingle();

      // Fetch payment provider
      const { data: payment } = await supabase
        .from("payment_providers")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .maybeSingle();

      // Fetch WhatsApp account
      const { data: whatsapp } = await supabase
        .from("whatsapp_accounts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .maybeSingle();

      setCatalogSource(catalog);
      setPaymentProvider(payment);
      setWhatsappAccount(whatsapp);
    } catch (error) {
      console.error("Error fetching integrations:", error);
    }
  };

  const activeCatalogs = catalogSource ? [
    { id: catalogSource.provider, name: catalogSource.provider === "shopify" ? "Shopify" : catalogSource.provider, icon: ShoppingBag, status: "connected" as const }
  ] : [];

  const activePayments = paymentProvider ? [
    { id: paymentProvider.provider, name: paymentProvider.provider === "stripe" ? "Stripe" : paymentProvider.provider, icon: CreditCard, status: "connected" as const }
  ] : [];

  const activeChannels = whatsappAccount ? [
    { id: "whatsapp", name: "WhatsApp", icon: MessageCircle, status: "connected" as const, active: true }
  ] : [];

  return (
    <aside className="w-60 border-r border-border flex flex-col bg-background">
      {/* Integration Groups */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Channels */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-3 px-2">Channels</h4>
          <div className="flex flex-wrap gap-2">
            {activeChannels.length > 0 ? (
              activeChannels.map((channel) => (
                <IntegrationCircle
                  key={channel.id}
                  name={channel.name}
                  icon={channel.icon}
                  status={channel.status}
                  active={channel.active}
                />
              ))
            ) : (
              <button
                onClick={() => navigate("/setup/channel")}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Channel
              </button>
            )}
          </div>
        </div>

        {/* Catalog */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-3 px-2">Catalog</h4>
          <div className="flex flex-wrap gap-2">
            {activeCatalogs.length > 0 ? (
              activeCatalogs.map((catalog) => (
                <IntegrationCircle
                  key={catalog.id}
                  name={catalog.name}
                  icon={catalog.icon}
                  status={catalog.status}
                />
              ))
            ) : (
              <button
                onClick={() => navigate("/setup/catalog")}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Catalog
              </button>
            )}
          </div>
        </div>

        {/* Payments */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-3 px-2">Payments</h4>
          <div className="flex flex-wrap gap-2">
            {activePayments.length > 0 ? (
              activePayments.map((payment) => (
                <IntegrationCircle
                  key={payment.id}
                  name={payment.name}
                  icon={payment.icon}
                  status={payment.status}
                />
              ))
            ) : (
              <button
                onClick={() => navigate("/setup/payment")}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Payment
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="divider-hairline pt-6">
          <nav className="space-y-1">
            {mainNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-foreground hover:bg-muted"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Company Settings (pinned bottom) */}
      <div className="border-t border-border p-4">
        <button 
          onClick={() => navigate("/settings")}
          className="flex items-center gap-3 w-full hover:bg-muted rounded-lg p-3 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
            {workspace?.logo_url ? (
              <img 
                src={workspace.logo_url} 
                alt="Company logo" 
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {workspace?.company_name || workspace?.name || 'Your Company'}
            </p>
            <p className="text-xs text-muted-foreground">Settings</p>
          </div>
        </button>
      </div>
    </aside>
  );
}
