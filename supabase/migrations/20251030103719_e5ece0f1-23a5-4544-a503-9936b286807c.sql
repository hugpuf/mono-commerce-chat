-- Add access_token field to whatsapp_accounts for storing per-account credentials
ALTER TABLE whatsapp_accounts 
ADD COLUMN IF NOT EXISTS access_token TEXT;

-- Add app_secret field for webhook verification
ALTER TABLE whatsapp_accounts
ADD COLUMN IF NOT EXISTS app_secret TEXT;