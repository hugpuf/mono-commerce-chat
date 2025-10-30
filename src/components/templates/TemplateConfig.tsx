import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Upload, Check, AlertCircle } from "lucide-react";

interface TemplateConfigProps {
  templateId: string | null;
}

export function TemplateConfig({ templateId }: TemplateConfigProps) {
  if (!templateId) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Select a template to configure
        </p>
      </div>
    );
  }

  const requiredVariables = [
    "{{invoice_number}}",
    "{{invoice_date}}",
    "{{billing_name}}",
    "{{line_items}}",
    "{{subtotal}}",
    "{{tax_total}}",
    "{{grand_total}}",
    "{{currency}}",
    "{{pay_link}}",
  ];

  return (
    <Tabs defaultValue="variables" className="h-full flex flex-col">
      <TabsList className="grid grid-cols-3 m-4 mb-0">
        <TabsTrigger value="branding" className="text-xs">
          Branding
        </TabsTrigger>
        <TabsTrigger value="variables" className="text-xs">
          Variables
        </TabsTrigger>
        <TabsTrigger value="layout" className="text-xs">
          Layout
        </TabsTrigger>
      </TabsList>

      <ScrollArea className="flex-1">
        {/* Branding Tab */}
        <TabsContent value="branding" className="p-4 space-y-6 m-0">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">
              LOGO
            </Label>
            <div className="mt-2">
              <div className="w-full h-24 border border-dashed border-border rounded flex items-center justify-center bg-muted/30">
                <Button variant="ghost" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-3 block">
              TYPE SCALE
            </Label>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Heading Size</Label>
                <Input type="number" defaultValue="24" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Body Size</Label>
                <Input type="number" defaultValue="14" className="mt-1" />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-3 block">
              ACCENT COLOR
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Optional single accent for links/headings
            </p>
            <Input type="color" defaultValue="#000000" />
          </div>
        </TabsContent>

        {/* Variables Tab */}
        <TabsContent value="variables" className="p-4 space-y-4 m-0">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
              REQUIRED VARIABLES
            </Label>
            <div className="space-y-2">
              {requiredVariables.map((variable, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded border border-border bg-muted/30"
                >
                  <code className="text-xs font-mono">{variable}</code>
                  <Check className="h-3 w-3 text-foreground" />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
              OPTIONAL VARIABLES
            </Label>
            <div className="space-y-2">
              {["{{discount_total}}", "{{shipping_total}}", "{{due_date}}"].map(
                (variable, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded border border-border"
                  >
                    <code className="text-xs font-mono">{variable}</code>
                    <Switch />
                  </div>
                )
              )}
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
              VALIDATION
            </Label>
            <div className="p-3 rounded border border-border bg-background">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs font-medium">Missing Variables</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ensure {`{{pay_link}}`} is present for payment collection
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout" className="p-4 space-y-6 m-0">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-3 block">
              PAGE SIZE
            </Label>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1">
                A4
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                Letter
              </Button>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-3 block">
              MARGINS
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Top</Label>
                <Input type="number" defaultValue="16" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Bottom</Label>
                <Input type="number" defaultValue="16" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Left</Label>
                <Input type="number" defaultValue="16" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Right</Label>
                <Input type="number" defaultValue="16" className="mt-1" />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-3 block">
              TABLE STYLE
            </Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Zebra striping</Label>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Show borders</Label>
                <Switch defaultChecked />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-3 block">
              NUMBER FORMAT
            </Label>
            <Input defaultValue="INV-{YYYY}-{SEQ}" className="font-mono text-xs" />
          </div>
        </TabsContent>
      </ScrollArea>

      <div className="border-t border-border p-4">
        <Button className="w-full">Save Changes</Button>
      </div>
    </Tabs>
  );
}
