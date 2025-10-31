import { NavLink, useNavigate, Link } from "react-router-dom";
import {
  ShoppingBag,
  CreditCard,
  MessageCircle,
  Package,
  FileText,
  Zap,
  ShoppingCart,
  BarChart3,
  Plus,
  Building2,
  Settings,
} from "lucide-react";
import { IntegrationCircle } from "./IntegrationCircle";
import { useWorkspace } from "@/contexts/WorkspaceContext";

// Mock connected integrations - in real app this would come from state/API
const connectedCatalogs = [
  { id: "shopify", name: "Shopify", icon: ShoppingBag, status: "connected" as const },
];

const connectedPayments = [
  { id: "stripe", name: "Stripe", icon: CreditCard, status: "connected" as const },
];

const connectedChannels = [
  { id: "whatsapp", name: "WhatsApp", icon: MessageCircle, status: "connected" as const, active: true },
];

const mainNavItems = [
  { path: "/conversations", label: "Conversations", icon: MessageCircle },
  { path: "/templates", label: "Templates", icon: FileText },
  { path: "/automations", label: "Automations", icon: Zap },
  { path: "/orders", label: "Orders", icon: ShoppingCart },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const { workspace } = useWorkspace();

  return (
    <aside className="w-60 border-r border-border flex flex-col bg-background">
      {/* Integration Groups */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Catalog */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-3 px-2">Catalog</h4>
          <div className="flex flex-wrap gap-2">
            {connectedCatalogs.map((catalog) => (
              <IntegrationCircle
                key={catalog.id}
                name={catalog.name}
                icon={catalog.icon}
                connected
                status={catalog.status}
              />
            ))}
            <IntegrationCircle
              name="Add Catalog"
              icon={Plus}
              onClick={() => navigate("/setup/catalog")}
            />
          </div>
        </div>

        {/* Payments */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-3 px-2">Payments</h4>
          <div className="flex flex-wrap gap-2">
            {connectedPayments.map((payment) => (
              <IntegrationCircle
                key={payment.id}
                name={payment.name}
                icon={payment.icon}
                connected
                status={payment.status}
              />
            ))}
            <IntegrationCircle
              name="Add Payment"
              icon={Plus}
              onClick={() => navigate("/setup/payment")}
            />
          </div>
        </div>

        {/* Channels */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-3 px-2">Channels</h4>
          <div className="flex flex-wrap gap-2">
            {connectedChannels.map((channel) => (
              <IntegrationCircle
                key={channel.id}
                name={channel.name}
                icon={channel.icon}
                connected
                status={channel.status}
                active={channel.active}
              />
            ))}
            <IntegrationCircle
              name="Add Channel"
              icon={Plus}
              onClick={() => navigate("/setup/channel")}
            />
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
        <Link
          to="/settings"
          className="flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors hover:bg-muted group"
        >
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            {workspace?.logo_url ? (
              <img 
                src={workspace.logo_url} 
                alt="Company logo" 
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <Building2 className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="text-sm font-medium truncate w-full">
              {workspace?.company_name || workspace?.name || 'Company'}
            </span>
            <span className="text-xs text-muted-foreground">Settings</span>
          </div>
          <Settings className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </Link>
      </div>
    </aside>
  );
}
