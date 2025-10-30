import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CSVUploadStep } from "./CSVUploadStep";
import { CSVFieldMapping } from "./CSVFieldMapping";
import { CSVValidationPreview } from "./CSVValidationPreview";
import { CSVImportResults } from "./CSVImportResults";
import { ParsedCSVData, FieldMapping, ValidationResult, ImportResult } from "./types";

interface CSVUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "upload" | "mapping" | "validation" | "results";

export function CSVUploadDialog({ open, onOpenChange }: CSVUploadDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [csvData, setCsvData] = useState<ParsedCSVData | null>(null);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileUploaded = (data: ParsedCSVData) => {
    setCsvData(data);
    setStep("mapping");
  };

  const handleMappingComplete = (mapping: FieldMapping) => {
    setFieldMapping(mapping);
    setStep("validation");
  };

  const handleValidationComplete = (result: ValidationResult) => {
    setValidationResult(result);
  };

  const handleImportComplete = (result: ImportResult) => {
    setImportResult(result);
    setStep("results");
  };

  const handleClose = () => {
    setStep("upload");
    setCsvData(null);
    setFieldMapping({});
    setValidationResult(null);
    setImportResult(null);
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === "mapping") setStep("upload");
    else if (step === "validation") setStep("mapping");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Upload Product Catalog"}
            {step === "mapping" && "Map Fields"}
            {step === "validation" && "Validate & Preview"}
            {step === "results" && "Import Results"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {step === "upload" && (
            <CSVUploadStep onFileUploaded={handleFileUploaded} />
          )}
          
          {step === "mapping" && csvData && (
            <CSVFieldMapping
              csvData={csvData}
              onComplete={handleMappingComplete}
              onBack={handleBack}
            />
          )}
          
          {step === "validation" && csvData && (
            <CSVValidationPreview
              csvData={csvData}
              fieldMapping={fieldMapping}
              onValidationComplete={handleValidationComplete}
              onImportComplete={handleImportComplete}
              onBack={handleBack}
            />
          )}
          
          {step === "results" && importResult && (
            <CSVImportResults
              result={importResult}
              onClose={handleClose}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
