-- Add currency and weight columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS weight NUMERIC;