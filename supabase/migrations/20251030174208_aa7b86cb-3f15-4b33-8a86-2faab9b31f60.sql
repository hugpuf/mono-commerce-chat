-- Create catalog_sources table for tracking product integrations
CREATE TABLE public.catalog_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'shopify', 'woocommerce', 'csv', 'manual'
  provider_config JSONB, -- store OAuth tokens, API keys, shop domain, etc.
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'error', 'disconnected'
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, provider)
);

-- Create payment_providers table for payment integrations
CREATE TABLE public.payment_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'stripe', -- 'stripe' for MVP
  account_id TEXT NOT NULL, -- Stripe account ID
  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  test_mode BOOLEAN NOT NULL DEFAULT true,
  provider_config JSONB, -- store additional Stripe data
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'error', 'disconnected'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, provider)
);

-- Create products table with variant support
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  catalog_source_id UUID REFERENCES public.catalog_sources(id) ON DELETE CASCADE,
  external_id TEXT, -- ID from external system (Shopify product ID, etc.)
  sku TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  compare_at_price DECIMAL(10, 2), -- original price for showing discounts
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  image_gallery JSONB, -- array of additional image URLs
  tags TEXT[], -- for search and categorization
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'archived', 'draft'
  -- Variant support
  is_variant BOOLEAN NOT NULL DEFAULT false,
  parent_product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  variant_options JSONB, -- e.g., {"size": "M", "color": "Blue"}
  -- Metadata
  metadata JSONB, -- flexible field for additional data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, sku)
);

-- Add business profile fields to whatsapp_accounts
ALTER TABLE public.whatsapp_accounts
ADD COLUMN webhook_status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'failed'
ADD COLUMN business_name TEXT,
ADD COLUMN logo_url TEXT,
ADD COLUMN about_text TEXT,
ADD COLUMN category TEXT,
ADD COLUMN address TEXT,
ADD COLUMN website TEXT,
ADD COLUMN email TEXT,
ADD COLUMN business_hours JSONB; -- e.g., {"monday": {"open": "09:00", "close": "17:00"}, ...} or "always_open"

-- Add onboarding progress fields to workspaces
ALTER TABLE public.workspaces
ADD COLUMN onboarding_step INTEGER DEFAULT 0,
ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE public.catalog_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for catalog_sources
CREATE POLICY "Allow authenticated users to manage catalog_sources"
ON public.catalog_sources
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create RLS policies for payment_providers
CREATE POLICY "Allow authenticated users to manage payment_providers"
ON public.payment_providers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create RLS policies for products
CREATE POLICY "Allow authenticated users to manage products"
ON public.products
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_catalog_sources_workspace ON public.catalog_sources(workspace_id);
CREATE INDEX idx_payment_providers_workspace ON public.payment_providers(workspace_id);
CREATE INDEX idx_products_workspace ON public.products(workspace_id);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_parent ON public.products(parent_product_id);
CREATE INDEX idx_products_catalog_source ON public.products(catalog_source_id);

-- Create triggers for updated_at
CREATE TRIGGER update_catalog_sources_updated_at
BEFORE UPDATE ON public.catalog_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_providers_updated_at
BEFORE UPDATE ON public.payment_providers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();