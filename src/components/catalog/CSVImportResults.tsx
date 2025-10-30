import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Download } from "lucide-react";
import { ImportResult } from "./types";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CSVImportResultsProps {
  result: ImportResult;
  onClose: () => void;
}

export function CSVImportResults({ result, onClose }: CSVImportResultsProps) {
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

      <div className="flex justify-center pt-4 border-t">
        <Button onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
