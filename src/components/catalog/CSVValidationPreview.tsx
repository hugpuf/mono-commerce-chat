import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { ParsedCSVData, FieldMapping, ValidationResult, ValidationError, ImportResult } from "./types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CSVValidationPreviewProps {
  csvData: ParsedCSVData;
  fieldMapping: FieldMapping;
  onValidationComplete: (result: ValidationResult) => void;
  onImportComplete: (result: ImportResult) => void;
  onBack: () => void;
}

export function CSVValidationPreview({
  csvData,
  fieldMapping,
  onValidationComplete,
  onImportComplete,
  onBack,
}: CSVValidationPreviewProps) {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    validateData();
  }, []);

  const validateData = () => {
    const errors: ValidationError[] = [];
    let validRows = 0;

    csvData.rows.forEach((row, index) => {
      const rowNumber = index + 2; // +2 for header row and 0-index
      let isValid = true;

      // Validate required fields
      if (!fieldMapping.sku || !row[fieldMapping.sku.sourceColumn]) {
        errors.push({ row: rowNumber, field: "sku", value: "", reason: "SKU is required" });
        isValid = false;
      }
      if (!fieldMapping.title || !row[fieldMapping.title.sourceColumn]) {
        errors.push({ row: rowNumber, field: "title", value: "", reason: "Title is required" });
        isValid = false;
      }
      if (!fieldMapping.price || !row[fieldMapping.price.sourceColumn]) {
        errors.push({ row: rowNumber, field: "price", value: "", reason: "Price is required" });
        isValid = false;
      }

      // Validate price is numeric
      if (fieldMapping.price) {
        const priceValue = row[fieldMapping.price.sourceColumn];
        if (priceValue && isNaN(Number(priceValue))) {
          errors.push({ row: rowNumber, field: "price", value: priceValue, reason: "Price must be numeric" });
          isValid = false;
        }
      }

      // Validate stock is numeric if provided
      if (fieldMapping.stock) {
        const stockValue = row[fieldMapping.stock.sourceColumn];
        if (stockValue && isNaN(Number(stockValue))) {
          errors.push({ row: rowNumber, field: "stock", value: stockValue, reason: "Stock must be numeric" });
          isValid = false;
        }
      }

      if (isValid) validRows++;
    });

    const result: ValidationResult = {
      totalRows: csvData.rows.length,
      validRows,
      invalidRows: csvData.rows.length - validRows,
      errors,
      preview: [],
    };

    setValidationResult(result);
    onValidationComplete(result);
    setIsValidating(false);
  };

  const handleImport = async () => {
    if (!validationResult) return;

    setIsImporting(true);
    let created = 0;
    let updated = 0;
    let failed = 0;
    const importErrors: ValidationError[] = [];

    try {
      // Get workspace from user profile
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to import products");
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("workspace_id")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("No workspace found. Please complete authentication first.");
      }

      const workspace_id = profile.workspace_id;

      // Process valid rows
      for (let i = 0; i < csvData.rows.length; i++) {
        const row = csvData.rows[i];
        const rowNumber = i + 2;

        // Skip rows with validation errors
        if (validationResult.errors.some(e => e.row === rowNumber)) {
          failed++;
          continue;
        }

        try {
          const productData: any = {
            workspace_id,
          };

          // Map fields
          Object.entries(fieldMapping).forEach(([targetField, mapping]) => {
            const value = row[mapping.sourceColumn];
            if (value) {
              switch (targetField) {
                case "price":
                case "compare_at_price":
                case "weight":
                  productData[targetField] = Number(value);
                  break;
                case "stock":
                  productData[targetField] = parseInt(value);
                  break;
                case "is_variant":
                  productData[targetField] = value.toLowerCase() === "true" || value === "1";
                  break;
                case "tags":
                case "image_gallery":
                  productData[targetField] = value.split(",").map(v => v.trim());
                  break;
                case "variant_options":
                case "metadata":
                  try {
                    productData[targetField] = JSON.parse(value);
                  } catch {
                    productData[targetField] = { raw: value };
                  }
                  break;
                default:
                  productData[targetField] = value;
              }
            }
          });

          // Upsert product by SKU
          const { error } = await supabase
            .from("products")
            .upsert(productData, { onConflict: "sku,workspace_id" });

          if (error) throw error;

          // Check if it was an update or create (simplified)
          const { data: existing } = await supabase
            .from("products")
            .select("id")
            .eq("sku", productData.sku)
            .eq("workspace_id", workspace_id)
            .single();

          if (existing) {
            updated++;
          } else {
            created++;
          }
        } catch (error: any) {
          failed++;
          importErrors.push({
            row: rowNumber,
            field: "general",
            value: "",
            reason: error.message,
          });
        }
      }

      const result: ImportResult = {
        created,
        updated,
        failed,
        errors: importErrors,
      };

      toast({
        title: "Import complete",
        description: `${created} created, ${updated} updated, ${failed} failed`,
      });

      onImportComplete(result);
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Validating your data...</p>
      </div>
    );
  }

  if (!validationResult) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">{validationResult.totalRows}</div>
          <div className="text-sm text-muted-foreground">Total Rows</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div className="text-2xl font-bold">{validationResult.validRows}</div>
          </div>
          <div className="text-sm text-muted-foreground">Ready to Import</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div className="text-2xl font-bold">{validationResult.invalidRows}</div>
          </div>
          <div className="text-sm text-muted-foreground">With Issues</div>
        </div>
      </div>

      {validationResult.invalidRows > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {validationResult.invalidRows} row(s) have validation errors and will be skipped.
            You can still import the valid rows.
          </AlertDescription>
        </Alert>
      )}

      {validationResult.errors.length > 0 && validationResult.errors.length <= 10 && (
        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">Validation Errors</h4>
          <div className="space-y-1 text-xs">
            {validationResult.errors.slice(0, 10).map((error, i) => (
              <div key={i} className="flex items-start gap-2 text-muted-foreground">
                <Badge variant="outline" className="text-xs">Row {error.row}</Badge>
                <span>{error.field}: {error.reason}</span>
              </div>
            ))}
          </div>
          {validationResult.errors.length > 10 && (
            <p className="text-xs text-muted-foreground">
              ...and {validationResult.errors.length - 10} more errors
            </p>
          )}
        </div>
      )}

      {isImporting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Importing products...</span>
            <span className="text-muted-foreground">Please wait</span>
          </div>
          <Progress value={undefined} className="h-2" />
        </div>
      )}

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={isImporting}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={handleImport} 
          disabled={validationResult.validRows === 0 || isImporting}
        >
          {isImporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>Import {validationResult.validRows} Products</>
          )}
        </Button>
      </div>
    </div>
  );
}
