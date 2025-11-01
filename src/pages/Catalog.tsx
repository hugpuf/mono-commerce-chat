import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { clearWorkspaceConnectionsCache } from "@/hooks/useWorkspaceConnections";
import { AppShell } from "@/components/AppShell";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import AddCatalog from "./setup/AddCatalog";

export default function Catalog() {
  const navigate = useNavigate();
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in-stock" | "low-stock" | "out-of-stock">("all");
  
  const [catalogSource, setCatalogSource] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (workspaceId) {
      fetchCatalogData();
    }
  }, [workspaceId]);

  const fetchCatalogData = async () => {
    try {
      setLoading(true);

      // Check if catalog source exists
      const { data: catalog } = await supabase
        .from("catalog_sources")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .maybeSingle();

      setCatalogSource(catalog);

      if (catalog) {
        // Fetch products
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (productsError) throw productsError;
        setProducts(productsData || []);
      }
    } catch (error) {
      console.error("Error fetching catalog:", error);
      toast({
        title: "Error loading catalog",
        description: "Failed to load your product catalog",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
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
        description: "Your products are being synced. This may take a few minutes.",
      });

      // Refresh data after a delay
      setTimeout(() => {
        fetchCatalogData();
      }, 2000);
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

  const handleCancelSync = async () => {
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

      // Clear cache to ensure sidebar updates immediately
      clearWorkspaceConnectionsCache(workspaceId);

      // Refresh data immediately
      fetchCatalogData();
    } catch (error: any) {
      console.error("Cancel sync error:", error);
      toast({
        title: "Failed to cancel sync",
        description: error.message || "Could not cancel the sync operation",
        variant: "destructive",
      });
    }
  };

  // Filter products based on search and stock filter
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title?.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    // Stock filter
    if (stockFilter !== "all") {
      filtered = filtered.filter((p) => {
        const stock = p.stock || 0;
        if (stockFilter === "out-of-stock") return stock === 0;
        if (stockFilter === "low-stock") return stock > 0 && stock <= 10;
        if (stockFilter === "in-stock") return stock > 10;
        return true;
      });
    }

    return filtered;
  }, [products, searchQuery, stockFilter]);

  // If no catalog source, show setup page
  if (!loading && !catalogSource) {
    return <AddCatalog />;
  }

  return (
    <AppShell>
      <div className="container mx-auto py-6 px-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading catalog...</p>
          </div>
        ) : (
          <>
            <CatalogHeader
              productsCount={products.length}
              filteredCount={filteredProducts.length}
              provider={catalogSource?.provider === "shopify" ? "Shopify" : catalogSource?.provider}
              shopDomain={catalogSource?.shop_domain}
              lastSync={catalogSource?.last_sync_at}
              syncStatus={catalogSource?.sync_status}
              onSync={handleSync}
              onCancelSync={handleCancelSync}
              onSettings={() => navigate("/settings/integrations")}
              syncLoading={syncLoading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              stockFilter={stockFilter}
              onStockFilterChange={setStockFilter}
            />

            {catalogSource?.sync_status === "syncing" && products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">Syncing your products</h3>
                <p className="text-sm text-muted-foreground">
                  This may take a few minutes depending on the size of your catalog
                </p>
              </div>
            ) : (
              <ProductGrid products={filteredProducts} shopDomain={catalogSource?.shop_domain} />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
