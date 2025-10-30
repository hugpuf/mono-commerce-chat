import { Button } from "@/components/ui/button";

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
        <p className="text-muted-foreground">Select a template to preview</p>
      </div>
    );
  }

  const width = previewMode === "desktop" ? 794 : 375; // A4 width in px at 96dpi, mobile 375px
  const height = pageSize === "a4" ? 1123 : 1056; // A4: 297mm, Letter: 279mm

  return (
    <div className="flex justify-center">
      <div
        className="bg-background border border-border shadow-sm transition-transform origin-top"
        style={{
          width: `${width}px`,
          minHeight: `${height}px`,
          transform: `scale(${zoom / 100})`,
        }}
      >
        {/* Mock Invoice Content */}
        <div className="p-16 space-y-8">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <div className="w-12 h-12 bg-foreground rounded mb-4" />
              <h1 className="text-2xl font-semibold">INVOICE</h1>
              <p className="text-sm text-muted-foreground font-mono">
                INV-2025-0142
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">Commerce Hub</p>
              <p className="text-muted-foreground">123 Business Street</p>
              <p className="text-muted-foreground">San Francisco, CA 94107</p>
              <p className="text-muted-foreground">hello@commercehub.com</p>
            </div>
          </div>

          <div className="divider-hairline" />

          {/* Bill To */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">
                BILL TO
              </h3>
              <p className="font-medium">Sarah Chen</p>
              <p className="text-sm text-muted-foreground">456 Customer Ave</p>
              <p className="text-sm text-muted-foreground">New York, NY 10001</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">
                INVOICE DETAILS
              </h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-mono">Jan 30, 2025</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-mono">Feb 13, 2025</span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-semibold">Item</th>
                  <th className="text-right py-2 font-semibold">Qty</th>
                  <th className="text-right py-2 font-semibold">Price</th>
                  <th className="text-right py-2 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-3">Premium Widget</td>
                  <td className="text-right font-mono">2</td>
                  <td className="text-right font-mono">$125.00</td>
                  <td className="text-right font-mono">$250.00</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3">Standard Service</td>
                  <td className="text-right font-mono">1</td>
                  <td className="text-right font-mono">$89.00</td>
                  <td className="text-right font-mono">$89.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-mono">$339.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (8.5%):</span>
                <span className="font-mono">$28.82</span>
              </div>
              <div className="divider-hairline" />
              <div className="flex justify-between text-base font-semibold">
                <span>Total:</span>
                <span className="font-mono">$367.82</span>
              </div>
            </div>
          </div>

          {/* Payment Link */}
          <div className="bg-muted p-4 rounded border border-border">
            <p className="text-sm font-medium mb-2">Pay Online</p>
            <p className="text-xs text-muted-foreground mb-3">
              Click the link below or scan the QR code to pay securely
            </p>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-foreground rounded" />
              <Button size="sm" className="font-mono text-xs">
                Pay $367.82
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-xs text-muted-foreground text-center pt-8">
            <p>Thank you for your business</p>
            <p className="mt-1">
              Questions? Contact us at hello@commercehub.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
