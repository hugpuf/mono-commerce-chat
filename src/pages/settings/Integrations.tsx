import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { IntegrationCard } from "@/components/settings/IntegrationCard";
import { DisconnectIntegrationDialog } from "@/components/settings/DisconnectIntegrationDialog";
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

  const [disconnectDialog, setDisconnectDialog] = useState<{
    open: boolean;
    type: "catalog" | "payment" | "whatsapp" | null;
  }>({ open: false, type: null });

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
      const { data: whatsappData } = await supabase
        .from("whatsapp_accounts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .limit(1);
      
      const whatsapp = whatsappData?.[0] || null;

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
      
      // Update sync status and clear any previous cancellation
      await supabase
        .from("catalog_sources")
        .update({ 
          sync_status: "syncing",
          cancellation_requested_at: null 
        })
        .eq("id", catalogSource.id);
      
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

  const handleCancelCatalogSync = async () => {
    if (!catalogSource) return;

    try {
      const { error } = await supabase.functions.invoke("cancel-sync", {
        body: { catalogSourceId: catalogSource.id },
      });

      if (error) throw error;

      toast({
        title: "Sync cancelled",
        description: "Product sync has been cancelled.",
      });

      // Refresh integration status
      await fetchIntegrations();
    } catch (error: any) {
      console.error("Cancel sync error:", error);
      toast({
        title: "Failed to cancel sync",
        description: error.message || "Could not cancel the sync operation",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectDialog.type) return;

    try {
      switch (disconnectDialog.type) {
        case "catalog":
          if (!catalogSource) return;
          
          const { error: catalogError } = await supabase
            .from("catalog_sources")
            .update({ status: "disconnected" })
            .eq("id", catalogSource.id);

          if (catalogError) throw catalogError;

          toast({
            title: "Catalog disconnected",
            description: "Your product catalog has been disconnected.",
          });
          break;

        case "payment":
          if (!paymentProvider) return;
          
          const { error: paymentError } = await supabase
            .from("payment_providers")
            .update({ status: "disconnected" })
            .eq("id", paymentProvider.id);

          if (paymentError) throw paymentError;

          toast({
            title: "Payment gateway disconnected",
            description: "Your payment provider has been disconnected.",
          });
          break;

        case "whatsapp":
          if (!whatsappAccount) return;
          
          const { error: whatsappError } = await supabase
            .from("whatsapp_accounts")
            .update({ status: "inactive" })
            .eq("id", whatsappAccount.id);

          if (whatsappError) throw whatsappError;

          toast({
            title: "WhatsApp disconnected",
            description: "Your WhatsApp Business account has been disconnected.",
          });
          break;
      }

      setDisconnectDialog({ open: false, type: null });
      await fetchIntegrations();
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast({
        title: "Disconnection failed",
        description: error.message || "Failed to disconnect integration",
        variant: "destructive",
      });
    }
  };

  const getDisconnectWarning = (type: string) => {
    switch (type) {
      case "catalog":
        return "Disconnecting your catalog will remove all synced products and prevent new product updates. You'll need to reconnect to restore catalog functionality.";
      case "payment":
        return "Disconnecting your payment gateway will prevent you from processing new transactions. Existing payment links will stop working.";
      case "whatsapp":
        return "Disconnecting WhatsApp will prevent you from sending and receiving messages. Your conversation history will be preserved but you won't be able to access it until you reconnect.";
      default:
        return undefined;
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
    <>
      <DisconnectIntegrationDialog
        open={disconnectDialog.open}
        onOpenChange={(open) => setDisconnectDialog({ open, type: null })}
        onConfirm={handleDisconnect}
        integrationName={
          disconnectDialog.type === "catalog"
            ? "Product Catalog"
            : disconnectDialog.type === "payment"
            ? "Payment Gateway"
            : "WhatsApp Business"
        }
        warningMessage={disconnectDialog.type ? getDisconnectWarning(disconnectDialog.type) : undefined}
      />

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
              onCancelSync={handleCancelCatalogSync}
              syncLoading={syncLoading}
              onSettings={() => navigate("/setup/add-catalog")}
              onDisconnect={() => setDisconnectDialog({ open: true, type: "catalog" })}
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
              onDisconnect={() => setDisconnectDialog({ open: true, type: "payment" })}
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
              onDisconnect={() => setDisconnectDialog({ open: true, type: "whatsapp" })}
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
    </>
  );
}
