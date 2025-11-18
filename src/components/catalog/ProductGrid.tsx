import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, ExternalLink, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  stock: number;
  image_url: string | null;
  sku: string;
  status: string;
  is_variant: boolean;
  variant_options: any;
  shopify_product_id?: string;
  shopify_variant_id?: string;
}

interface ProductGridProps {
  products: Product[];
  shopDomain?: string;
  onStatusChange?: () => void;
}

export function ProductGrid({ products, shopDomain, onStatusChange }: ProductGridProps) {
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          Out of Stock
        </Badge>
      );
    }
    if (stock <= 10) {
      return (
        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20 gap-1">
          <AlertTriangle className="w-3 h-3" />
          Low Stock ({stock})
        </Badge>
      );
    }
    return null;
  };

  const getShopifyUrl = (product: Product) => {
    if (!shopDomain || !product.shopify_product_id) return null;
    
    // If it's a variant, link to the variant edit page
    if (product.is_variant && product.shopify_variant_id) {
      return `https://${shopDomain}/admin/products/${product.shopify_product_id}/variants/${product.shopify_variant_id}`;
    }
    
    // Otherwise link to the product page
    return `https://${shopDomain}/admin/products/${product.shopify_product_id}`;
  };

  const handleStatusChange = async (productId: string, newStatus: string) => {
    setUpdatingStatus(productId);
    
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', productId);

      if (error) throw error;

      toast.success(`Product status updated to ${newStatus}`);
      onStatusChange?.();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update product status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No products found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => {
        const shopifyUrl = getShopifyUrl(product);
        const stockBadge = getStockBadge(product.stock);
        
        return (
          <Card key={product.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
            <div className="aspect-square relative bg-muted">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              
              {/* Top badges */}
              <div className="absolute top-2 left-2 right-2 flex justify-between gap-2">
                <div className="flex gap-2">
                  {stockBadge}
                </div>
                <div className="flex gap-2">
                  {product.status !== "active" && (
                    <Badge variant="secondary">{product.status}</Badge>
                  )}
                </div>
              </div>

              {/* Shopify link overlay */}
              {shopifyUrl && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(shopifyUrl, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View in Shopify
                  </Button>
                </div>
              )}
            </div>

            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold line-clamp-1">{product.title}</h3>
                {product.is_variant && product.variant_options && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {Object.entries(product.variant_options)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(" • ")}
                  </p>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold">${Number(product.price).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{product.stock} in stock</div>
                </div>
              </div>

              <Select 
                value={product.status} 
                onValueChange={(value) => handleStatusChange(product.id, value)}
                disabled={updatingStatus === product.id}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
