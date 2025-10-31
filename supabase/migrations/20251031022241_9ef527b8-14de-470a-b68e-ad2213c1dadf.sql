-- Add Shopify-specific fields to catalog_sources
ALTER TABLE catalog_sources 
ADD COLUMN IF NOT EXISTS shop_domain text,
ADD COLUMN IF NOT EXISTS access_token text,
ADD COLUMN IF NOT EXISTS api_version text DEFAULT '2024-10',
ADD COLUMN IF NOT EXISTS scopes text[],
ADD COLUMN IF NOT EXISTS webhook_subscriptions jsonb DEFAULT '[]'::jsonb;

-- Create Shopify location tracking
CREATE TABLE IF NOT EXISTS shopify_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_source_id uuid NOT NULL REFERENCES catalog_sources(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  shopify_location_id text NOT NULL,
  name text NOT NULL,
  address jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(catalog_source_id, shopify_location_id)
);

-- Create inventory reservations table
CREATE TABLE IF NOT EXISTS inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  reserved_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'fulfilled', 'released')),
  reserved_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create discount tracking table
CREATE TABLE IF NOT EXISTS order_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  original_price numeric NOT NULL,
  discounted_price numeric NOT NULL,
  discount_amount numeric GENERATED ALWAYS AS (original_price - discounted_price) STORED,
  discount_percentage numeric GENERATED ALWAYS AS (ROUND(((original_price - discounted_price) / NULLIF(original_price, 0) * 100)::numeric, 2)) STORED,
  reason text,
  approved_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Add Shopify-specific fields to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS shopify_product_id text,
ADD COLUMN IF NOT EXISTS shopify_variant_id text,
ADD COLUMN IF NOT EXISTS shopify_inventory_item_id text,
ADD COLUMN IF NOT EXISTS inventory_by_location jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS handle text,
ADD COLUMN IF NOT EXISTS vendor text,
ADD COLUMN IF NOT EXISTS product_type text,
ADD COLUMN IF NOT EXISTS collection_ids text[];

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_shopify_variant ON products(shopify_variant_id) WHERE shopify_variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_shopify_product ON products(shopify_product_id) WHERE shopify_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expires ON inventory_reservations(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product ON inventory_reservations(product_id, status);
CREATE INDEX IF NOT EXISTS idx_shopify_locations_source ON shopify_locations(catalog_source_id);

-- Enable RLS
ALTER TABLE shopify_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_discounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shopify_locations
CREATE POLICY "Users can read own workspace shopify locations"
  ON shopify_locations FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own workspace shopify locations"
  ON shopify_locations FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM user_profiles WHERE user_id = auth.uid()
  ));

-- RLS Policies for inventory_reservations
CREATE POLICY "Users can read own workspace reservations"
  ON inventory_reservations FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own workspace reservations"
  ON inventory_reservations FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM user_profiles WHERE user_id = auth.uid()
  ));

-- RLS Policies for order_discounts
CREATE POLICY "Users can read own workspace discounts"
  ON order_discounts FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own workspace discounts"
  ON order_discounts FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM user_profiles WHERE user_id = auth.uid()
  ));

-- Create function to auto-expire reservations
CREATE OR REPLACE FUNCTION expire_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE inventory_reservations
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'active'
    AND expires_at < now();
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_shopify_locations_updated_at
  BEFORE UPDATE ON shopify_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_reservations_updated_at
  BEFORE UPDATE ON inventory_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();