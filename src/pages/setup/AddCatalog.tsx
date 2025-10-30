import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShoppingBag,
  ShoppingCart,
  Package,
  Store,
  Hexagon,
  Box,
  Grid,
  Globe,
  ArrowLeft,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { CSVUploadDialog } from "@/components/catalog/CSVUploadDialog";

interface CatalogProvider {
  id: string;
  name: string;
  icon: typeof ShoppingBag;
  description: string;
}

const catalogProviders: CatalogProvider[] = [
  {
    id: "manual",
    name: "Manual Upload",
    icon: Upload,
    description: "Upload CSV file with products",
  },
  {
    id: "shopify",
    name: "Shopify",
    icon: ShoppingBag,
    description: "Connect your Shopify store",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    icon: ShoppingCart,
    description: "WordPress e-commerce plugin",
  },
  {
    id: "bigcommerce",
    name: "BigCommerce",
    icon: Store,
    description: "Enterprise e-commerce platform",
  },
  {
    id: "magento",
    name: "Magento (Adobe Commerce)",
    icon: Box,
    description: "Adobe's commerce solution",
  },
  {
    id: "squarespace",
    name: "Squarespace",
    icon: Hexagon,
    description: "All-in-one website builder",
  },
  {
    id: "wix",
    name: "Wix",
    icon: Grid,
    description: "Website builder with e-commerce",
  },
  {
    id: "square",
    name: "Square Online",
    icon: Package,
    description: "Square's online store",
  },
  {
    id: "google",
    name: "Google Merchant Center",
    icon: Globe,
    description: "Google product listings",
  },
  {
    id: "etsy",
    name: "Etsy",
    icon: Package,
    description: "Handmade & vintage marketplace",
  },
  {
    id: "amazon",
    name: "Amazon Seller Central",
    icon: Package,
    description: "Amazon marketplace integration",
  },
];

export default function AddCatalog() {
  const navigate = useNavigate();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const handleConnect = (providerId: string) => {
    if (providerId === "manual") {
      setUploadDialogOpen(true);
      return;
    }
    console.log("Connecting to:", providerId);
    // In real app, would trigger OAuth or API connection flow
  };

  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto">
        <CSVUploadDialog 
          open={uploadDialogOpen} 
          onOpenChange={setUploadDialogOpen}
        />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">Add Catalog Provider</h1>
          <p className="text-muted-foreground">
            Connect your product catalog from any supported platform
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {catalogProviders.map((provider) => {
            const Icon = provider.icon;
            return (
              <Card
                key={provider.id}
                className="border-border hover:border-foreground/20 transition-all duration-200"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center bg-muted">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{provider.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {provider.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleConnect(provider.id)}
                  >
                    {provider.id === "manual" ? "Upload File" : "Connect"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
