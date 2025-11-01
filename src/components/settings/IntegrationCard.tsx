import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Settings, Unlink, CheckCircle, AlertCircle, Clock, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface IntegrationCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: "connected" | "disconnected" | "error" | "syncing";
  provider?: string;
  lastSync?: Date | string;
  statusMessage?: string;
  onSync?: () => void;
  onCancelSync?: () => void;
  onSettings?: () => void;
  onDisconnect?: () => void;
  syncLoading?: boolean;
}

export function IntegrationCard({
  title,
  description,
  icon,
  status,
  provider,
  lastSync,
  statusMessage,
  onSync,
  onCancelSync,
  onSettings,
  onDisconnect,
  syncLoading = false,
}: IntegrationCardProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case "syncing":
        return (
          <Badge variant="default" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
            <Clock className="w-3 h-3 mr-1 animate-spin" />
            Syncing
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      case "disconnected":
        return (
          <Badge variant="secondary">
            Disconnected
          </Badge>
        );
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            {provider && (
              <p className="text-sm text-muted-foreground">{provider}</p>
            )}
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <p className="text-sm text-muted-foreground mb-4">{description}</p>

      {status === "connected" && lastSync && (
        <div className="text-xs text-muted-foreground mb-4 flex items-center gap-2">
          <Clock className="w-3 h-3" />
          Last synced {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
        </div>
      )}

      {statusMessage && (
        <p className="text-xs text-muted-foreground mb-4 p-2 bg-muted rounded">
          {statusMessage}
        </p>
      )}

      {(status === "connected" || status === "syncing") && (
        <div className="flex gap-2">
          {status === "syncing" && onCancelSync ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancelSync}
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          ) : onSync && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSync}
              disabled={syncLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncLoading ? 'animate-spin' : ''}`} />
              {syncLoading ? 'Starting...' : 'Sync Now'}
            </Button>
          )}
          {onSettings && (
            <Button variant="outline" size="sm" onClick={onSettings}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          )}
          {onDisconnect && (
            <Button variant="ghost" size="sm" onClick={onDisconnect}>
              <Unlink className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
