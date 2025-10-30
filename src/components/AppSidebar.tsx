import { NavLink } from "react-router-dom";
import {
  ShoppingBag,
  CreditCard,
  MessageCircle,
  MessageSquare,
  Instagram,
  Facebook,
  Smartphone,
  Send,
  Package,
  FileText,
  Zap,
  ShoppingCart,
  BarChart3,
} from "lucide-react";
import { IntegrationCircle } from "./IntegrationCircle";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const catalogIntegrations = [
  { id: "shopify", name: "Shopify", icon: ShoppingBag, connected: true },
  { id: "woocommerce", name: "WooCommerce", icon: ShoppingCart, connected: false },
  { id: "bigcommerce", name: "BigCommerce", icon: Package, connected: false },
  { id: "magento", name: "Magento", icon: Package, connected: false },
  { id: "squarespace", name: "Squarespace", icon: Package, connected: false },
  { id: "wix", name: "Wix", icon: Package, connected: false },
];

const paymentIntegrations = [
  { id: "stripe", name: "Stripe", icon: CreditCard, connected: true },
  { id: "paypal", name: "PayPal", icon: CreditCard, connected: false },
  { id: "square", name: "Square", icon: CreditCard, connected: false },
];

const channelIntegrations = [
  { id: "whatsapp", name: "WhatsApp", icon: MessageCircle, connected: true, active: true },
  { id: "instagram", name: "Instagram DM", icon: Instagram, connected: false, disabled: true },
  { id: "messenger", name: "Messenger", icon: Facebook, connected: false, disabled: true },
  { id: "sms", name: "SMS", icon: Smartphone, connected: false, disabled: true },
  { id: "telegram", name: "Telegram", icon: Send, connected: false, disabled: true },
];

const mainNavItems = [
  { path: "/conversations", label: "Conversations", icon: MessageCircle },
  { path: "/catalog", label: "Catalog", icon: ShoppingBag },
  { path: "/templates", label: "Templates", icon: FileText },
  { path: "/automations", label: "Automations", icon: Zap },
  { path: "/orders", label: "Orders", icon: ShoppingCart },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function AppSidebar() {
  return (
    <aside className="w-60 border-r border-border flex flex-col bg-background">
      {/* Integration Groups */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Catalog */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-3 px-2">Catalog</h4>
          <div className="grid grid-cols-5 gap-2">
            {catalogIntegrations.map((integration) => (
              <IntegrationCircle key={integration.id} {...integration} />
            ))}
          </div>
        </div>

        {/* Payments */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-3 px-2">Payments</h4>
          <div className="grid grid-cols-5 gap-2">
            {paymentIntegrations.map((integration) => (
              <IntegrationCircle key={integration.id} {...integration} />
            ))}
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

      {/* Channels (pinned bottom) */}
      <div className="border-t border-border p-4">
        <h4 className="text-xs font-semibold text-muted-foreground mb-3 px-2">Channels</h4>
        <div className="flex gap-2">
          {channelIntegrations.map((integration) => (
            <IntegrationCircle key={integration.id} {...integration} />
          ))}
        </div>
      </div>
    </aside>
  );
}
