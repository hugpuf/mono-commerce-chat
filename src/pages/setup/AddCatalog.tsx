import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ShopifyConnectDialog } from "@/components/catalog/ShopifyConnectDialog";
import { useShopifyOAuth } from "@/hooks/useShopifyOAuth";

interface CatalogProvider {
  id: string;
  name: string;
  icon: typeof ShoppingBag;
  description: string;
  comingSoon?: boolean;
}

const catalogProviders: CatalogProvider[] = [
  {
    id: "manual",
    name: "Manual Upload",
    icon: Upload,
    description: "Upload CSV file with products",
    comingSoon: false,
  },
  {
    id: "shopify",
    name: "Shopify",
    icon: ShoppingBag,
    description: "Connect your Shopify store",
    comingSoon: false,
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    icon: ShoppingCart,
    description: "WordPress e-commerce plugin",
    comingSoon: true,
  },
  {
    id: "bigcommerce",
    name: "BigCommerce",
    icon: Store,
    description: "Enterprise e-commerce platform",
    comingSoon: true,
  },
  {
    id: "magento",
    name: "Magento (Adobe Commerce)",
    icon: Box,
    description: "Adobe's commerce solution",
    comingSoon: true,
  },
  {
    id: "squarespace",
    name: "Squarespace",
    icon: Hexagon,
    description: "All-in-one website builder",
    comingSoon: true,
  },
  {
    id: "wix",
    name: "Wix",
    icon: Grid,
    description: "Website builder with e-commerce",
    comingSoon: true,
  },
  {
    id: "square",
    name: "Square Online",
    icon: Package,
    description: "Square's online store",
    comingSoon: true,
  },
  {
    id: "google",
    name: "Google Merchant Center",
    icon: Globe,
    description: "Google product listings",
    comingSoon: true,
  },
  {
    id: "etsy",
    name: "Etsy",
    icon: Package,
    description: "Handmade & vintage marketplace",
    comingSoon: true,
  },
  {
    id: "amazon",
    name: "Amazon Seller Central",
    icon: Package,
    description: "Amazon marketplace integration",
    comingSoon: true,
  },
];

export default function AddCatalog() {
  const navigate = useNavigate();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [shopifyDialogOpen, setShopifyDialogOpen] = useState(false);
  const { initiateOAuth } = useShopifyOAuth();

  const handleConnect = (providerId: string) => {
    if (providerId === "manual") {
      setUploadDialogOpen(true);
      return;
    }
    
    if (providerId === "shopify") {
      setShopifyDialogOpen(true);
      return;
    }
    
    console.log("Connecting to:", providerId);
    // In real app, would trigger OAuth or API connection flow
  };

  const handleShopifyConnect = (shopDomain: string) => {
    setShopifyDialogOpen(false);
    initiateOAuth(shopDomain);
  };

  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto">
        <CSVUploadDialog 
          open={uploadDialogOpen} 
          onOpenChange={setUploadDialogOpen}
        />
        <ShopifyConnectDialog
          open={shopifyDialogOpen}
          onOpenChange={setShopifyDialogOpen}
          onConnect={handleShopifyConnect}
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
            const isComingSoon = provider.comingSoon;
            return (
              <Card
                key={provider.id}
                className={`border-border transition-all duration-200 ${
                  isComingSoon 
                    ? "opacity-60" 
                    : "hover:border-foreground/20"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full border border-border flex items-center justify-center bg-muted ${
                      isComingSoon ? "opacity-50" : ""
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{provider.name}</CardTitle>
                        {isComingSoon && (
                          <Badge variant="secondary" className="text-xs">Soon</Badge>
                        )}
                      </div>
                      <CardDescription className={`text-xs mt-1 ${
                        isComingSoon ? "opacity-70" : ""
                      }`}>
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
                    onClick={() => !isComingSoon && handleConnect(provider.id)}
                    disabled={isComingSoon}
                  >
                    {isComingSoon 
                      ? "Coming Soon" 
                      : provider.id === "manual" 
                      ? "Upload File" 
                      : "Connect"
                    }
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
