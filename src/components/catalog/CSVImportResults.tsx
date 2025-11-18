import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Download, Package, AlertTriangle } from "lucide-react";
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
  const hasIssues = result.failed > 0;

  const handleViewCatalog = (statusFilter?: string) => {
    // Show success toast
    toast({
      title: "Catalog imported successfully",
      description: `${totalImported} product${totalImported !== 1 ? 's' : ''} ready to sell`,
    });
    
    // Clear cache to update sidebar
    clearWorkspaceConnectionsCache(workspaceId);
    
    // Navigate to catalog view with optional filter
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
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
          hasIssues ? "bg-yellow-100" : "bg-green-100"
        }`}>
          {hasIssues ? (
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          ) : (
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          )}
        </div>
        <h3 className="text-xl font-semibold mb-2">
          {hasIssues ? "Import Complete with Issues" : "Import Complete"}
        </h3>
        <p className="text-muted-foreground">
          {hasIssues 
            ? "Some products need attention before they can be activated"
            : "Your products have been imported successfully"
          }
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{result.created}</div>
            <div className="text-sm text-muted-foreground">Active</div>
            <div className="text-xs text-muted-foreground mt-1">Ready to sell</div>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{result.updated}</div>
            <div className="text-sm text-muted-foreground">Updated</div>
            <div className="text-xs text-muted-foreground mt-1">Existing products</div>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-red-600">{result.failed}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
            <div className="text-xs text-muted-foreground mt-1">Need fixes</div>
          </div>
        </div>

        {result.failed > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">
                  {result.failed} row(s) failed validation
                </p>
                <p className="text-sm">
                  Common issues: Missing required fields (SKU, title, price), invalid data formats, or duplicate SKUs.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDownloadErrors}
                  className="mt-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Error Report
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex justify-center gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={() => handleViewCatalog()}>
          <Package className="h-4 w-4 mr-2" />
          View Active Products
        </Button>
      </div>
    </div>
  );
}
