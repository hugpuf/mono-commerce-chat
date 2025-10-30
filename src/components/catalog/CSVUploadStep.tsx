import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import Papa from "papaparse";
import { ParsedCSVData } from "./types";
import { useToast } from "@/hooks/use-toast";

interface CSVUploadStepProps {
  onFileUploaded: (data: ParsedCSVData) => void;
}

export function CSVUploadStep({ onFileUploaded }: CSVUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({
            title: "Error parsing CSV",
            description: results.errors[0].message,
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }

        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];

        onFileUploaded({
          headers,
          rows,
          fileName: file.name,
          totalRows: rows.length,
        });
        setIsProcessing(false);
      },
      error: (error) => {
        toast({
          title: "Error parsing CSV",
          description: error.message,
          variant: "destructive",
        });
        setIsProcessing(false);
      },
    });
  }, [onFileUploaded, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center transition-all
          ${isDragging ? "border-primary bg-primary/5" : "border-border"}
          ${isProcessing ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">
          {isProcessing ? "Processing file..." : "Drop your CSV file here"}
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          or click the button below to browse
        </p>
        
        <Button variant="outline" disabled={isProcessing}>
          <Upload className="h-4 w-4 mr-2" />
          <label className="cursor-pointer">
            Choose File
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
              disabled={isProcessing}
            />
          </label>
        </Button>
      </div>

      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Supported formats:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>CSV files from Shopify, WooCommerce, Wix, or any other platform</li>
          <li>Custom CSV files with any column names (you'll map them in the next step)</li>
          <li>UTF-8 encoding recommended</li>
        </ul>
      </div>
    </div>
  );
}
