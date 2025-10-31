import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface ShopifyConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (shopDomain: string) => void;
}

export function ShopifyConnectDialog({ open, onOpenChange, onConnect }: ShopifyConnectDialogProps) {
  const [shopDomain, setShopDomain] = useState("");
  const [error, setError] = useState("");

  const handleConnect = () => {
    // Validate shop domain format
    let domain = shopDomain.trim().toLowerCase();
    
    if (!domain) {
      setError("Please enter your Shopify store domain");
      return;
    }

    // Remove https:// or http:// if present
    domain = domain.replace(/^https?:\/\//, "");
    
    // Remove trailing slash
    domain = domain.replace(/\/$/, "");

    // Check if it's a valid myshopify.com domain or custom domain
    if (!domain.includes(".")) {
      // If just store name provided, add .myshopify.com
      domain = `${domain}.myshopify.com`;
    }

    // Basic validation
    if (domain.length < 5) {
      setError("Please enter a valid store domain");
      return;
    }

    setError("");
    onConnect(domain);
  };

  const handleInputChange = (value: string) => {
    setShopDomain(value);
    if (error) setError("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Connect Shopify Store</DialogTitle>
          <DialogDescription>
            Enter your Shopify store domain to connect your product catalog
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="shop-domain">Store Domain</Label>
            <Input
              id="shop-domain"
              placeholder="mystore.myshopify.com"
              value={shopDomain}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2 text-sm">
                <p className="font-medium">This app will request permission to:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Read your products and inventory</li>
                  <li>Write to products and inventory</li>
                  <li>Access store locations</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  You'll be redirected to Shopify to authorize these permissions.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConnect}>
            Connect Store
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
