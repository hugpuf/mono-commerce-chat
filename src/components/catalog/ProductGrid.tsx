import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Edit } from "lucide-react";

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
}

interface ProductGridProps {
  products: Product[];
  onEdit?: (product: Product) => void;
}

export function ProductGrid({ products, onEdit }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No products found</h3>
        <p className="text-sm text-muted-foreground">
          Your synced products will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => (
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
            {product.status !== "active" && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary">{product.status}</Badge>
              </div>
            )}
            {product.stock <= 0 && (
              <div className="absolute top-2 left-2">
                <Badge variant="destructive">Out of Stock</Badge>
              </div>
            )}
          </div>

          <div className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold line-clamp-2 flex-1">
                {product.title}
              </h3>
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onEdit(product)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
            </div>

            {product.is_variant && product.variant_options && (
              <p className="text-xs text-muted-foreground">
                {Object.entries(product.variant_options)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(" • ")}
              </p>
            )}

            <div className="flex items-center justify-between">
              <p className="text-lg font-bold">
                ${Number(product.price).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                Stock: {product.stock}
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              SKU: {product.sku}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
