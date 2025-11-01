-- Enable fuzzy search extension for product search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enhance conversations table for shopping functionality
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS cart_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS cart_total NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES user_profiles(id),
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS opt_in_status TEXT DEFAULT 'pending' CHECK (opt_in_status IN ('pending', 'opted_in', 'opted_out')),
ADD COLUMN IF NOT EXISTS opt_in_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_interaction_type TEXT;

-- Create immutable function for text search indexing
CREATE OR REPLACE FUNCTION products_search_text(p products) 
RETURNS TEXT AS $$
  SELECT p.title || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.tags::text, '')
$$ LANGUAGE SQL IMMUTABLE;

-- Create index for product full-text search (using immutable function)
CREATE INDEX IF NOT EXISTS idx_products_search ON products 
USING GIN (to_tsvector('english', products_search_text(products.*)));

-- Create trigram index for fuzzy product matching
CREATE INDEX IF NOT EXISTS idx_products_trigram ON products 
USING GIN (title gin_trgm_ops);

-- Create orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  order_number TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) NOT NULL,
  tax NUMERIC(10,2) DEFAULT 0,
  shipping NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method TEXT,
  payment_link_url TEXT,
  payment_link_expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  tracking_number TEXT,
  shipping_address JSONB,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage orders in their workspace
CREATE POLICY "Users can manage own workspace orders"
ON orders
FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Create indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_workspace ON orders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_orders_conversation ON orders(conversation_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Create function to search products with fuzzy matching
CREATE OR REPLACE FUNCTION search_products(
  workspace_uuid UUID,
  search_query TEXT,
  category_filter TEXT DEFAULT NULL,
  max_price_filter NUMERIC DEFAULT NULL,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  price NUMERIC,
  stock INTEGER,
  image_url TEXT,
  sku TEXT,
  variant_options JSONB,
  similarity_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.description,
    p.price,
    p.stock,
    p.image_url,
    p.sku,
    p.variant_options,
    similarity(p.title, search_query) as sim_score
  FROM products p
  WHERE 
    p.workspace_id = workspace_uuid
    AND p.status = 'active'
    AND (category_filter IS NULL OR p.product_type = category_filter)
    AND (max_price_filter IS NULL OR p.price <= max_price_filter)
    AND (
      -- Full-text search using immutable function
      to_tsvector('english', products_search_text(p.*)) @@ plainto_tsquery('english', search_query)
      OR
      -- Fuzzy match on title
      similarity(p.title, search_query) > 0.2
      OR
      -- SKU exact/partial match
      p.sku ILIKE '%' || search_query || '%'
    )
  ORDER BY 
    -- Prefer exact SKU matches
    CASE WHEN p.sku ILIKE search_query THEN 0 ELSE 1 END,
    -- Then by similarity
    similarity(p.title, search_query) DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate unique order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    new_number := 'ORD-' || LPAD(floor(random() * 999999)::TEXT, 6, '0');
    
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_number = new_number) INTO exists_check;
    
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update orders.updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();