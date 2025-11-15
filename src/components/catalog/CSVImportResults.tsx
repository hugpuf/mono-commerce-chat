import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Download, Package } from "lucide-react";
import { ImportResult } from "./types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { clearWorkspaceConnectionsCache } from "@/hooks/useWorkspaceConnections";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface CSVImportResultsProps {
  result: ImportResult;
  onClose: () => void;
}

export function CSVImportResults({ result, onClose }: CSVImportResultsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { workspaceId } = useWorkspace();

  const totalImported = result.created + result.updated;

  const handleViewCatalog = () => {
    // Show success toast
    toast({
      title: "Catalog imported successfully",
      description: `${totalImported} product${totalImported !== 1 ? 's' : ''} ready to sell`,
    });
    
    // Clear cache to update sidebar
    clearWorkspaceConnectionsCache(workspaceId);
    
    // Navigate to catalog view
    navigate("/catalog");
    onClose();
  };

  const handleDownloadErrors = () => {
    if (result.errors.length === 0) return;

    const csvContent = [
      ["Row", "Field", "Value", "Reason"].join(","),
      ...result.errors.map(e => [e.row, e.field, `"${e.value}"`, `"${e.reason}"`].join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-errors.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Import Complete</h3>
        <p className="text-muted-foreground">
          Your products have been imported successfully
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{result.created}</div>
          <div className="text-sm text-muted-foreground">Created</div>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{result.updated}</div>
          <div className="text-sm text-muted-foreground">Updated</div>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{result.failed}</div>
          <div className="text-sm text-muted-foreground">Failed</div>
        </div>
      </div>

      {result.failed > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{result.failed} row(s) failed to import</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadErrors}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Error Report
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={handleViewCatalog}>
          <Package className="h-4 w-4 mr-2" />
          View Catalog
        </Button>
      </div>
    </div>
  );
}
