import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { IntegrationCard } from "@/components/settings/IntegrationCard";
import { ShoppingBag, CreditCard, MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Integrations() {
  const navigate = useNavigate();
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);

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
      setLoading(true);

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
    } finally {
      setLoading(false);
    }
  };

  const handleCatalogSync = async () => {
    if (!catalogSource) return;

    try {
      setSyncLoading(true);
      
      // Call Shopify bulk import function
      const { error } = await supabase.functions.invoke("shopify-bulk-import", {
        body: { catalogSourceId: catalogSource.id },
      });

      if (error) throw error;

      toast({
        title: "Sync started",
        description: "Your products are being synced from Shopify.",
      });

      // Refresh integration status
      await fetchIntegrations();
    } catch (error: any) {
      console.error("Sync error:", error);
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync products",
        variant: "destructive",
      });
    } finally {
      setSyncLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground mt-2">
            Manage your connected services and integrations
          </p>
        </div>
        <p className="text-muted-foreground">Loading integrations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Manage your connected services and integrations
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-3">Product Catalog</h2>
          {catalogSource ? (
            <IntegrationCard
              title="Product Catalog"
              description="Sync and manage your product inventory"
              icon={<ShoppingBag className="w-5 h-5 text-primary" />}
              status={catalogSource.sync_status === "syncing" ? "syncing" : "connected"}
              provider={catalogSource.provider === "shopify" ? "Shopify" : catalogSource.provider}
              lastSync={catalogSource.last_sync_at}
              statusMessage={
                catalogSource.products_count
                  ? `${catalogSource.products_count} products synced`
                  : "No products synced yet"
              }
              onSync={handleCatalogSync}
              syncLoading={syncLoading}
              onSettings={() => navigate("/setup/add-catalog")}
            />
          ) : (
            <IntegrationCard
              title="Product Catalog"
              description="Connect your product catalog from Shopify, WooCommerce, or upload manually"
              icon={<ShoppingBag className="w-5 h-5 text-muted-foreground" />}
              status="disconnected"
            />
          )}
          {!catalogSource && (
            <Button
              onClick={() => navigate("/setup/add-catalog")}
              className="mt-3"
            >
              <Plus className="w-4 h-4 mr-2" />
              Connect Catalog
            </Button>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3">Payment Gateway</h2>
          {paymentProvider ? (
            <IntegrationCard
              title="Payment Gateway"
              description="Process payments and manage transactions"
              icon={<CreditCard className="w-5 h-5 text-primary" />}
              status="connected"
              provider={paymentProvider.provider === "stripe" ? "Stripe" : paymentProvider.provider}
              statusMessage={
                paymentProvider.test_mode
                  ? "Test mode enabled"
                  : "Live mode"
              }
              onSettings={() => navigate("/setup/add-payment")}
            />
          ) : (
            <IntegrationCard
              title="Payment Gateway"
              description="Connect Stripe to accept payments"
              icon={<CreditCard className="w-5 h-5 text-muted-foreground" />}
              status="disconnected"
            />
          )}
          {!paymentProvider && (
            <Button
              onClick={() => navigate("/setup/add-payment")}
              className="mt-3"
            >
              <Plus className="w-4 h-4 mr-2" />
              Connect Payment
            </Button>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3">Communication Channel</h2>
          {whatsappAccount ? (
            <IntegrationCard
              title="WhatsApp Business"
              description="Connect with customers via WhatsApp"
              icon={<MessageSquare className="w-5 h-5 text-primary" />}
              status="connected"
              provider="Meta WhatsApp Business"
              statusMessage={`Phone: ${whatsappAccount.phone_number || 'Not configured'}`}
              onSettings={() => navigate("/settings/whatsapp/connection")}
            />
          ) : (
            <IntegrationCard
              title="WhatsApp Business"
              description="Connect WhatsApp Business to communicate with customers"
              icon={<MessageSquare className="w-5 h-5 text-muted-foreground" />}
              status="disconnected"
            />
          )}
          {!whatsappAccount && (
            <Button
              onClick={() => navigate("/setup/add-channel")}
              className="mt-3"
            >
              <Plus className="w-4 h-4 mr-2" />
              Connect WhatsApp
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
