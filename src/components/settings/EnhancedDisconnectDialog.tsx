import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Package, Archive, Trash2 } from "lucide-react";
import { useState } from "react";

interface EnhancedDisconnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (productAction: "keep" | "archive" | "delete") => void;
  integrationName: string;
  integrationType: "catalog" | "payment" | "whatsapp";
  productCount?: number;
}

export function EnhancedDisconnectDialog({
  open,
  onOpenChange,
  onConfirm,
  integrationName,
  integrationType,
  productCount = 0,
}: EnhancedDisconnectDialogProps) {
  const [productAction, setProductAction] = useState<"keep" | "archive" | "delete">("keep");

  const handleConfirm = () => {
    onConfirm(productAction);
    onOpenChange(false);
  };

  const getWarningMessage = () => {
    switch (integrationType) {
      case "catalog":
        return "Disconnecting your catalog will stop automatic product updates from your external source. Your products will remain in the system.";
      case "payment":
        return "Disconnecting your payment gateway will prevent you from processing new transactions. Existing payment links will stop working.";
      case "whatsapp":
        return "Disconnecting WhatsApp will prevent you from sending and receiving messages. Your conversation history will be preserved but you won't be able to access it until you reconnect.";
      default:
        return undefined;
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <AlertDialogTitle>Disconnect {integrationName}?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-4">
            <p>{getWarningMessage()}</p>

            {integrationType === "catalog" && productCount > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <p className="font-medium text-foreground">
                  What would you like to do with your {productCount} existing products?
                </p>
                
                <RadioGroup value={productAction} onValueChange={(value: any) => setProductAction(value)}>
                  <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="keep" id="keep" className="mt-0.5" />
                    <Label htmlFor="keep" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-primary" />
                        <span className="font-medium">Keep products active</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Products remain active and visible. You can manage them manually or reconnect later.
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="archive" id="archive" className="mt-0.5" />
                    <Label htmlFor="archive" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Archive className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium">Archive all products</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Products are hidden but preserved. You can reactivate them later.
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3 rounded-lg border border-destructive/20 p-3 hover:bg-destructive/5 cursor-pointer">
                    <RadioGroupItem value="delete" id="delete" className="mt-0.5" />
                    <Label htmlFor="delete" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="font-medium text-destructive">Delete all products</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Permanently remove all products. This action cannot be undone.
                      </p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            variant={productAction === "delete" ? "destructive" : "default"}
          >
            {productAction === "delete" ? "Disconnect & Delete" : "Disconnect"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
