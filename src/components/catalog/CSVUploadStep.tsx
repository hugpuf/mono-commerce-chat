import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, Download } from "lucide-react";
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

  const handleDownloadTemplate = () => {
    const data = [
      {
        sku: "PROD-001",
        handle: "sample-product",
        title: "Sample Product",
        description: "This is a sample product description",
        price: "29.99",
        compare_at_price: "39.99",
        stock: "100",
        status: "active",
        image_url: "https://example.com/image.jpg",
        image_gallery: "https://example.com/img1.jpg,https://example.com/img2.jpg",
        tags: "tag1,tag2,tag3",
        variant_options: '{"color":"red","size":"medium"}',
        is_variant: "false",
        parent_product_id: "",
        weight: "0.5",
        vendor: "Sample Brand",
        currency: "USD",
        metadata: '{"custom_field":"value"}'
      }
    ];

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "product-catalog-template.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

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

      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b">
          <p className="font-medium text-foreground">Need a template?</p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDownloadTemplate}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Supported formats:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>CSV files from Shopify, WooCommerce, Wix, or any other platform</li>
            <li>Custom CSV files with any column names (you&apos;ll map them in the next step)</li>
            <li>UTF-8 encoding recommended</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
