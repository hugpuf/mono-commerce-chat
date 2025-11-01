import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Settings, ShoppingBag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CatalogHeaderProps {
  productsCount: number;
  provider?: string;
  lastSync?: Date | string | null;
  syncStatus?: string;
  onSync?: () => void;
  onSettings?: () => void;
  syncLoading?: boolean;
}

export function CatalogHeader({
  productsCount,
  provider,
  lastSync,
  syncStatus,
  onSync,
  onSettings,
  syncLoading = false,
}: CatalogHeaderProps) {
  const getStatusBadge = () => {
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
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <ShoppingBag className="w-6 h-6 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Product Catalog</h1>
            {syncStatus && getStatusBadge()}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span>{productsCount} products</span>
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
        </div>
      </div>

      <div className="flex gap-2">
        {onSync && (
          <Button
            variant="outline"
            onClick={onSync}
            disabled={syncLoading || syncStatus === "syncing"}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncLoading || syncStatus === "syncing" ? 'animate-spin' : ''}`} />
            {syncLoading || syncStatus === "syncing" ? 'Syncing...' : 'Sync Now'}
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
  );
}
