export interface ParsedCSVData {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
  totalRows: number;
}

export interface FieldMapping {
  [targetField: string]: {
    sourceColumn: string;
    transform?: "none" | "split_comma" | "json" | "number" | "boolean";
  };
}

export interface SavedMapping {
  id: string;
  name: string;
  mapping: FieldMapping;
  created_at: string;
}

export interface ValidationError {
  row: number;
  field: string;
  value: string;
  reason: string;
}

export interface ValidationResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ValidationError[];
  preview: ProductPreview[];
}

export interface ProductPreview {
  sku: string;
  title: string;
  price: number;
  stock: number;
  isVariant: boolean;
  variants?: number;
}

export interface ImportResult {
  created: number;
  updated: number;
  failed: number;
  errors: ValidationError[];
  downloadUrl?: string;
}

export const TARGET_FIELDS = [
  { key: "sku", label: "SKU", required: true, type: "text" },
  { key: "title", label: "Title", required: true, type: "text" },
  { key: "handle", label: "Handle", required: false, type: "text" },
  { key: "description", label: "Description", required: false, type: "text" },
  { key: "price", label: "Price", required: true, type: "number" },
  { key: "compare_at_price", label: "Compare at Price", required: false, type: "number" },
  { key: "stock", label: "Stock", required: false, type: "number" },
  { key: "status", label: "Status", required: false, type: "select" },
  { key: "image_url", label: "Image URL", required: false, type: "text" },
  { key: "image_gallery", label: "Image Gallery", required: false, type: "multivalue" },
  { key: "tags", label: "Tags", required: false, type: "multivalue" },
  { key: "variant_options", label: "Variant Options", required: false, type: "json" },
  { key: "is_variant", label: "Is Variant", required: false, type: "boolean" },
  { key: "parent_product_id", label: "Parent Product ID", required: false, type: "text" },
  { key: "weight", label: "Weight", required: false, type: "number" },
  { key: "vendor", label: "Vendor/Brand", required: false, type: "text" },
  { key: "currency", label: "Currency", required: false, type: "text" },
  { key: "metadata", label: "Metadata", required: false, type: "json" },
] as const;
