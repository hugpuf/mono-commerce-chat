import { FileText } from "lucide-react";

interface TemplatePreviewProps {
  templateId: string | null;
  zoom: number;
  previewMode: "desktop" | "mobile";
  pageSize: "a4" | "letter";
}

export function TemplatePreview({
  templateId,
  zoom,
  previewMode,
  pageSize,
}: TemplatePreviewProps) {
  if (!templateId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Select a template to preview</p>
        </div>
      </div>
    );
  }

  const width = previewMode === "desktop" ? 794 : 375; // A4 width in px at 96dpi, mobile 375px
  const height = pageSize === "a4" ? 1123 : 1056; // A4: 297mm, Letter: 279mm

  return (
    <div className="flex items-center justify-center min-h-full py-12">
      <div
        className="bg-white shadow-sm border border-border origin-top"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          transform: `scale(${zoom / 100})`,
        }}
      >
        {/* Simplified A4 Placeholder */}
        <div className="p-16 h-full flex flex-col text-black">
          {/* Header */}
          <div className="flex justify-between items-start mb-16">
            <div className="w-20 h-20 bg-gray-100 rounded" />
            <div className="text-right">
              <div className="text-2xl font-bold mb-6">INVOICE</div>
              <div className="text-xs text-gray-400 space-y-1 font-mono">
                <div>INV-2024-001</div>
                <div>January 15, 2024</div>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-16">
            <div className="text-xs font-semibold text-gray-400 mb-3">BILL TO</div>
            <div className="space-y-2">
              <div className="h-3 w-40 bg-gray-100 rounded" />
              <div className="h-2 w-48 bg-gray-50 rounded" />
              <div className="h-2 w-44 bg-gray-50 rounded" />
            </div>
          </div>

          {/* Line Items */}
          <div className="flex-1 mb-12">
            <div className="border-b border-gray-200 pb-3 mb-6">
              <div className="flex text-xs font-semibold text-gray-400">
                <div className="flex-1">DESCRIPTION</div>
                <div className="w-16 text-right">QTY</div>
                <div className="w-24 text-right">AMOUNT</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <div className="h-3 w-56 bg-gray-100 rounded mb-1" />
                  <div className="h-2 w-40 bg-gray-50 rounded" />
                </div>
                <div className="w-16 text-right">
                  <div className="h-3 w-8 bg-gray-50 rounded ml-auto" />
                </div>
                <div className="w-24 text-right">
                  <div className="h-3 w-20 bg-gray-100 rounded ml-auto" />
                </div>
              </div>
              <div className="flex items-center">
                <div className="flex-1">
                  <div className="h-3 w-48 bg-gray-100 rounded" />
                </div>
                <div className="w-16 text-right">
                  <div className="h-3 w-8 bg-gray-50 rounded ml-auto" />
                </div>
                <div className="w-24 text-right">
                  <div className="h-3 w-20 bg-gray-100 rounded ml-auto" />
                </div>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-12">
            <div className="w-72 space-y-3 text-sm">
              <div className="flex justify-between text-gray-400 text-xs">
                <span>Subtotal</span>
                <div className="h-3 w-24 bg-gray-50 rounded" />
              </div>
              <div className="flex justify-between text-gray-400 text-xs">
                <span>Tax</span>
                <div className="h-3 w-20 bg-gray-50 rounded" />
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-3">
                <span className="text-xs font-semibold">Total</span>
                <div className="h-4 w-28 bg-gray-100 rounded" />
              </div>
            </div>
          </div>

          {/* Payment Link */}
          <div className="bg-gray-50 border border-gray-100 rounded p-4">
            <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-9 w-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
