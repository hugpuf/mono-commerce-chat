import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Settings, ShoppingBag, Search, ExternalLink, XCircle, LayoutGrid, List } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface CatalogHeaderProps {
  productsCount: number;
  filteredCount: number;
  productCounts: { active: number; draft: number; archived: number; total: number };
  provider?: string;
  shopDomain?: string;
  lastSync?: Date | string | null;
  syncStatus?: string;
  onSync?: () => void;
  onCancelSync?: () => void;
  onSettings?: () => void;
  syncLoading?: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  stockFilter: "all" | "in-stock" | "low-stock" | "out-of-stock";
  onStockFilterChange: (value: "all" | "in-stock" | "low-stock" | "out-of-stock") => void;
  statusFilter: "all" | "active" | "draft" | "archived";
  onStatusFilterChange: (value: "all" | "active" | "draft" | "archived") => void;
  viewMode: "gallery" | "list";
  onViewModeChange: (value: "gallery" | "list") => void;
}

export function CatalogHeader({
  productsCount,
  filteredCount,
  productCounts,
  provider,
  shopDomain,
  lastSync,
  syncStatus,
  onSync,
  onCancelSync,
  onSettings,
  syncLoading = false,
  searchQuery,
  onSearchChange,
  stockFilter,
  onStockFilterChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
}: CatalogHeaderProps) {
  const getStatusBadge = () => {
    // For manual imports, show "Manual Catalog" instead of "Synced"
    if (provider === "manual" && syncStatus === "success") {
      return (
        <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
          Manual Catalog
        </Badge>
      );
    }

    switch (syncStatus) {
      case "syncing":
        return (
          <Badge variant="default" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Syncing
          </Badge>
        );
      case "success":
        return (
          <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
            Synced
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            Sync Error
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            Sync Cancelled
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <ShoppingBag className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Product Catalog</h1>
              {syncStatus && getStatusBadge()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {filteredCount === productsCount
                    ? `${productsCount} products`
                    : `${filteredCount} of ${productsCount} products`}
                </span>
                {provider && (
                  <>
                    <span>•</span>
                    <span>Connected to {provider}</span>
                  </>
                )}
                {lastSync && (
                  <>
                    <span>•</span>
                    <span>
                      Last synced {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
                    </span>
                  </>
                )}
              </div>
              {productCounts.total > 0 && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {productCounts.active} active
                  </span>
                  {productCounts.draft > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-yellow-600 dark:text-yellow-400">
                        {productCounts.draft} draft
                      </span>
                    </>
                  )}
                  {productCounts.archived > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-muted-foreground">
                        {productCounts.archived} archived
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {shopDomain && (
            <Button
              variant="outline"
              onClick={() => window.open(`https://${shopDomain}/admin/products`, "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View in Shopify
            </Button>
          )}
          {onSync && syncStatus === "syncing" ? (
            <Button
              variant="outline"
              onClick={onCancelSync}
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel Sync
            </Button>
          ) : onSync && (
            <Button
              variant="outline"
              onClick={onSync}
              disabled={syncLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncLoading ? 'animate-spin' : ''}`} />
              {syncLoading ? 'Starting...' : 'Sync Now'}
            </Button>
          )}
          {onSettings && (
            <Button variant="outline" onClick={onSettings}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          )}
        </div>
      </div>

      {/* Search, Filters, and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name, SKU, or description..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && onViewModeChange(value as "gallery" | "list")}>
          <ToggleGroupItem value="gallery" aria-label="Gallery view">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        <Select value={stockFilter} onValueChange={onStockFilterChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="in-stock">In Stock (&gt;10)</SelectItem>
            <SelectItem value="low-stock">Low Stock (1-10)</SelectItem>
            <SelectItem value="out-of-stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active ({productCounts.active})</SelectItem>
            <SelectItem value="draft">Draft ({productCounts.draft})</SelectItem>
            <SelectItem value="archived">Archived ({productCounts.archived})</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
