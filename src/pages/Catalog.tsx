import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { clearWorkspaceConnectionsCache } from "@/hooks/useWorkspaceConnections";
import { AppShell } from "@/components/AppShell";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { ProductList } from "@/components/catalog/ProductList";
import { CatalogWelcomeBanner } from "@/components/catalog/CatalogWelcomeBanner";
import { SyncHistoryCard } from "@/components/catalog/SyncHistoryCard";
import AddCatalog from "./setup/AddCatalog";

export default function Catalog() {
  const navigate = useNavigate();
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in-stock" | "low-stock" | "out-of-stock">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "archived">("all");
  const [viewMode, setViewMode] = useState<"gallery" | "list">("gallery");
  
  const [catalogSource, setCatalogSource] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [productCounts, setProductCounts] = useState({ active: 0, draft: 0, archived: 0, total: 0 });
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(() => {
    // Check if this is the first time viewing catalog after import
    const hasSeenWelcome = localStorage.getItem(`catalog-welcome-${workspaceId}`);
    return !hasSeenWelcome;
  });

  useEffect(() => {
    if (workspaceId) {
      fetchCatalogData();
    }
  }, [workspaceId]);

  // Real-time subscription for sync status updates
  useEffect(() => {
    if (!catalogSource?.id) return;
    
    const channel = supabase
      .channel('catalog-sync-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'catalog_sources',
          filter: `id=eq.${catalogSource.id}`
        },
        (payload) => {
          const newStatus = payload.new.sync_status;
          console.log('Sync status updated:', newStatus);
          if (newStatus === 'success' || newStatus === 'failed') {
            fetchCatalogData();
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [catalogSource?.id]);

  const fetchCatalogData = async () => {
    try {
      setLoading(true);

      // Fetch active catalog source and ALL products with status counts in parallel
      const [catalogRes, productsRes, countsRes] = await Promise.all([
        supabase
          .from("catalog_sources")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("status", "active")
          .maybeSingle(),
        supabase
          .from("products")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false }),
        // Get counts for each status
        supabase
          .from("products")
          .select("status")
          .eq("workspace_id", workspaceId)
      ]);

      const catalog = catalogRes.data || null;
      const productsData = productsRes.data || [];

      // Calculate status counts
      const counts = { active: 0, draft: 0, archived: 0, total: 0 };
      if (countsRes.data) {
        countsRes.data.forEach((p) => {
          if (p.status === "active") counts.active++;
          else if (p.status === "draft") counts.draft++;
          else if (p.status === "archived") counts.archived++;
        });
        counts.total = countsRes.data.length;
      }
      setProductCounts(counts);

      // Set all products so UI can handle filtering
      setProducts(productsData);

      // If there is no active catalog source but products exist, assume manual import
      if (catalog) {
        setCatalogSource(catalog);
      } else if (productsData.length > 0) {
        setCatalogSource({ provider: "manual", status: "active", id: null, sync_status: "success" });
      } else {
        setCatalogSource(null);
      }

      // Welcome banner if products exist and user hasn't seen it
      if (productsData && productsData.length > 0) {
        const hasSeenWelcome = localStorage.getItem(`catalog-welcome-${workspaceId}`);
        setShowWelcomeBanner(!hasSeenWelcome);
      }

      if (productsRes.error) throw productsRes.error;
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
        body: { 
          catalogSourceId: catalogSource.id,
          workspaceId: workspaceId 
        },
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

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    return filtered;
  }, [products, searchQuery, stockFilter, statusFilter]);

  const handleDismissWelcome = () => {
    localStorage.setItem(`catalog-welcome-${workspaceId}`, "true");
    setShowWelcomeBanner(false);
  };

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
            {showWelcomeBanner && products.length > 0 && (
              <CatalogWelcomeBanner
                productsCount={products.length}
                onDismiss={handleDismissWelcome}
              />
            )}

            <CatalogHeader
              productsCount={products.length}
              filteredCount={filteredProducts.length}
              productCounts={productCounts}
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
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

            {/* Sync History */}
            {products.length > 0 && (
              <div className="mb-6">
                <SyncHistoryCard
                  workspaceId={workspaceId}
                  catalogSourceId={catalogSource?.id}
                  provider={catalogSource?.provider}
                />
              </div>
            )}

            {catalogSource?.sync_status === "syncing" && products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">Syncing your products from Shopify</h3>
                <p className="text-sm text-muted-foreground">
                  This may take a few minutes depending on the size of your catalog
                </p>
                {catalogSource?.products_count > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {catalogSource.products_count} products synced so far
                  </p>
                )}
              </div>
            ) : catalogSource?.sync_status === "failed" ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="text-destructive mb-4">
                  <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Sync failed</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {catalogSource?.sync_error || "An error occurred while syncing your products"}
                </p>
              </div>
            ) : viewMode === "gallery" ? (
              <ProductGrid 
                products={filteredProducts} 
                shopDomain={catalogSource?.shop_domain}
                onStatusChange={fetchCatalogData}
              />
            ) : (
              <ProductList 
                products={filteredProducts} 
                shopDomain={catalogSource?.shop_domain}
                onStatusChange={fetchCatalogData}
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
