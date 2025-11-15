import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  ShoppingBag,
  CreditCard,
  FileText,
  Zap,
  ShoppingCart,
  BarChart3,
  Plus,
  Camera,
  MessageSquare,
  Package2,
} from "lucide-react";
import { IntegrationCircle } from "./IntegrationCircle";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceConnections } from "@/hooks/useWorkspaceConnections";
import { useWorkspaceProductCount } from "@/hooks/useWorkspaceProductCount";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import logo from '@/assets/logo.png';
import shopifyLogo from '@/assets/shopify-logo.png';
import whatsappLogo from '@/assets/whatsapp-logo.png';
import stripeLogo from '@/assets/stripe-logo.png';

const mainNavItems = [
  { path: "/templates", label: "Templates", icon: FileText },
  { path: "/automations", label: "Workflows", icon: Zap },
  { path: "/orders", label: "Orders", icon: ShoppingCart },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
];

interface AppSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ mobileOpen = false, onMobileClose }: AppSidebarProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { workspace, workspaceId } = useWorkspace();
  const { data: connections } = useWorkspaceConnections(workspaceId);
  const { data: productCount } = useWorkspaceProductCount(workspaceId);

  const catalogSource = connections?.catalogSource || null;
  const paymentProvider = connections?.paymentProvider || null;
  const whatsappAccount = connections?.whatsappAccount || null;
  const hasProducts = !catalogSource && (productCount ?? 0) > 0;

  const activeCatalogs = catalogSource
    ? [
        {
          id: catalogSource.provider,
          name: catalogSource.provider === "shopify" ? "Shopify" : "Products",
          icon: catalogSource.provider === "shopify" ? shopifyLogo : undefined,
          showPackageIcon: catalogSource.provider !== "shopify",
          status: "connected" as const,
        },
      ]
    : hasProducts
    ? [
        {
          id: "manual",
          name: "Products",
          showPackageIcon: true,
          status: "connected" as const,
        },
      ]
    : [];

  const activePayments = paymentProvider ? [
    { id: paymentProvider.provider, name: paymentProvider.provider === "stripe" ? "Stripe" : paymentProvider.provider, icon: stripeLogo, status: "connected" as const }
  ] : [];

  const activeChannels = whatsappAccount ? [
    { id: "whatsapp", name: "WhatsApp", icon: whatsappLogo, status: "connected" as const, active: location.pathname === "/conversations" }
  ] : [];

  const handleNavClick = () => {
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  const sidebarContent = (
    <aside className="w-60 border-r border-border flex flex-col bg-background h-full">
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
                  connected={true}
                  status={channel.status}
                  active={channel.active}
                  onClick={() => {
                    navigate("/conversations");
                    handleNavClick();
                  }}
                />
              ))
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    navigate("/setup/channel");
                    handleNavClick();
                  }}
                  className="integration-circle integration-circle-inactive"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-sm text-muted-foreground">Add Channel</span>
              </div>
            )}
          </div>
        </div>

        {/* Catalog */}
        <div>
          <div className="flex items-center justify-between mb-3 px-2">
            <h4 className="text-xs font-semibold text-muted-foreground">Catalog</h4>
            {(catalogSource || hasProducts) && (
              <span className="text-xs text-muted-foreground">
                {(catalogSource?.products_count ?? productCount ?? 0)} products
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {activeCatalogs.length > 0 ? (
              <div className="flex items-center gap-2">
                {activeCatalogs.map((catalog) => (
                  catalog.showPackageIcon ? (
                    <button
                      key={catalog.id}
                      onClick={() => {
                        navigate("/catalog");
                        handleNavClick();
                      }}
                      className={`integration-circle ${
                        location.pathname === "/catalog" 
                          ? "integration-circle-active" 
                          : "integration-circle-connected"
                      }`}
                    >
                      <Package2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <IntegrationCircle
                      key={catalog.id}
                      name={catalog.name}
                      icon={catalog.icon}
                      connected={true}
                      status={catalog.status}
                      active={location.pathname === "/catalog"}
                      onClick={() => {
                        navigate("/catalog");
                        handleNavClick();
                      }}
                    />
                  )
                ))}
                <span className="text-xs text-green-600 font-medium">✓ Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    navigate("/setup/catalog");
                    handleNavClick();
                  }}
                  className="integration-circle integration-circle-inactive"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-sm text-muted-foreground">Add Catalog</span>
              </div>
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
                  connected={true}
                  status={payment.status}
                  active={location.pathname === "/orders"}
                  onClick={() => {
                    navigate("/orders");
                    handleNavClick();
                  }}
                />
              ))
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    navigate("/setup/payment");
                    handleNavClick();
                  }}
                  className="integration-circle integration-circle-inactive"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-sm text-muted-foreground">Add Payment</span>
              </div>
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
                onClick={handleNavClick}
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
          onClick={() => {
            navigate("/settings");
            handleNavClick();
          }}
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

  // Mobile: render in Sheet drawer
  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose?.()}>
        <SheetContent side="left" className="p-0 w-60">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: render directly
  return sidebarContent;
}
