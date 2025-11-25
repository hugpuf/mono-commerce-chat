import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, ExternalLink, AlertTriangle, X } from "lucide-react";
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

interface ProductListProps {
  products: Product[];
  shopDomain?: string;
  onStatusChange?: () => void;
}

export function ProductList({ products, shopDomain, onStatusChange }: ProductListProps) {
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const allProductIds = products.map(p => p.id);
  const allSelected = selectedProducts.length === products.length && products.length > 0;
  const someSelected = selectedProducts.length > 0 && selectedProducts.length < products.length;

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
          Low Stock
        </Badge>
      );
    }
    return <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">In Stock</Badge>;
  };

  const getShopifyUrl = (product: Product) => {
    if (!shopDomain || !product.shopify_product_id) return null;
    
    if (product.is_variant && product.shopify_variant_id) {
      return `https://${shopDomain}/admin/products/${product.shopify_product_id}/variants/${product.shopify_variant_id}`;
    }
    
    return `https://${shopDomain}/admin/products/${product.shopify_product_id}`;
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(allProductIds);
    }
  };

  const toggleSelectProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    setBulkUpdating(true);
    
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .in('id', selectedProducts);

      if (error) throw error;

      toast.success(`Updated ${selectedProducts.length} product${selectedProducts.length > 1 ? 's' : ''} to ${newStatus}`);
      setSelectedProducts([]);
      onStatusChange?.();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update products');
    } finally {
      setBulkUpdating(false);
    }
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
    <div className="space-y-4">
      {selectedProducts.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedProducts.length} selected
            </span>
            <Select onValueChange={handleBulkStatusChange} disabled={bulkUpdating}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Set Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Set Active</SelectItem>
                <SelectItem value="draft">Set Draft</SelectItem>
                <SelectItem value="archived">Set Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedProducts([])}
            disabled={bulkUpdating}
          >
            <X className="w-4 h-4 mr-2" />
            Clear Selection
          </Button>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all products"
                  className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                />
              </TableHead>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {products.map((product) => {
            const shopifyUrl = getShopifyUrl(product);
            const isSelected = selectedProducts.includes(product.id);
            
            return (
              <TableRow key={product.id}>
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelectProduct(product.id)}
                    aria-label={`Select ${product.title}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="w-16 h-16 rounded bg-muted flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-md">
                    <div className="font-medium">{product.title}</div>
                    {product.description && (
                      <div className="text-sm text-muted-foreground truncate mt-1">
                        {product.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{product.sku}</code>
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${product.price.toFixed(2)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{product.stock}</span>
                    {getStockBadge(product.stock)}
                  </div>
                </TableCell>
                <TableCell>
                  <Select 
                    value={product.status} 
                    onValueChange={(value) => handleStatusChange(product.id, value)}
                    disabled={updatingStatus === product.id}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  {shopifyUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(shopifyUrl, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
