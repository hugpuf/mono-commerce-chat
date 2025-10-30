import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface UploadTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadTemplateDialog({
  open,
  onOpenChange,
}: UploadTemplateDialogProps) {
  const [dragActive, setDragActive] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Template</DialogTitle>
          <DialogDescription>
            Upload a PDF, DOCX, PNG, JPG, or HTML file. You'll tag variables after
            upload.
          </DialogDescription>
        </DialogHeader>

        <div
          className={`
            border-2 border-dashed rounded-lg p-12 text-center transition-colors
            ${dragActive ? "border-foreground bg-muted" : "border-border"}
          `}
          onDragEnter={() => setDragActive(true)}
          onDragLeave={() => setDragActive(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            // Handle file drop
          }}
        >
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Upload className="h-5 w-5" />
          </div>
          <h3 className="font-medium mb-2">Drag & drop your template</h3>
          <p className="text-sm text-muted-foreground mb-4">
            or click to browse files
          </p>
          <Button variant="outline" size="sm">
            Choose File
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Supports PDF, DOCX, PNG, JPG, HTML (max 10MB)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
