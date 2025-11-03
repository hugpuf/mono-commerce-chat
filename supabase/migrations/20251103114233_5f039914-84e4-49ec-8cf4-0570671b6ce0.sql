-- Add business_id, token_type, and token_expires_at to whatsapp_accounts table
ALTER TABLE public.whatsapp_accounts 
ADD COLUMN IF NOT EXISTS business_id TEXT,
ADD COLUMN IF NOT EXISTS token_type TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;