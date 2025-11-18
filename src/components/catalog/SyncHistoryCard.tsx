import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { History, Upload, RefreshCw, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  products_synced: number | null;
  products_updated: number | null;
  products_deleted: number | null;
  error_message: string | null;
}

interface SyncHistoryCardProps {
  workspaceId: string;
  catalogSourceId: string | null;
  provider?: string;
}

export function SyncHistoryCard({ workspaceId, catalogSourceId, provider }: SyncHistoryCardProps) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (catalogSourceId) {
      fetchSyncLogs();
    }
  }, [catalogSourceId, workspaceId]);

  const fetchSyncLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("integration_sync_logs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("catalog_source_id", catalogSourceId!)
        .order("started_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching sync logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSyncIcon = (syncType: string, status: string) => {
    if (status === "running") return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
    if (status === "failed") return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (syncType === "manual") return <RefreshCw className="h-4 w-4 text-green-500" />;
    if (syncType === "initial") return <Upload className="h-4 w-4 text-primary" />;
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: "default" as const,
      running: "secondary" as const,
      failed: "destructive" as const,
    };
    return <Badge variant={variants[status as keyof typeof variants] || "secondary"}>{status}</Badge>;
  };

  const getSyncSummary = (log: SyncLog) => {
    const parts: string[] = [];
    if (log.products_synced && log.products_synced > 0) parts.push(`+${log.products_synced} new`);
    if (log.products_updated && log.products_updated > 0) parts.push(`~${log.products_updated} updated`);
    if (log.products_deleted && log.products_deleted > 0) parts.push(`-${log.products_deleted} removed`);
    return parts.length > 0 ? parts.join(", ") : "No changes";
  };

  const displayLogs = showAll ? logs : logs.slice(0, 3);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Sync History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading sync history...</p>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return null;
  }

  const historyTitle = provider === "manual" ? "Import History" : "Sync History";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          {historyTitle}
        </CardTitle>
        {logs.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show Less" : `View All (${logs.length})`}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className={showAll ? "h-[300px]" : ""}>
          <div className="space-y-3">
            {displayLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="mt-0.5">
                  {getSyncIcon(log.sync_type, log.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium capitalize">
                      {log.sync_type === "webhook" ? "Auto sync" : log.sync_type} sync
                    </span>
                    {getStatusBadge(log.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getSyncSummary(log)}
                  </p>
                  {log.error_message && (
                    <p className="text-xs text-destructive mt-1">{log.error_message}</p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
