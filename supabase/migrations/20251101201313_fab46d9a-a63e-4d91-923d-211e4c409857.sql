-- Table to track one-time OAuth code usage for idempotency
CREATE TABLE IF NOT EXISTS public.oauth_code_uses (
  code TEXT PRIMARY KEY,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  workspace_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'whatsapp'
);

-- Index for auto-cleanup of old codes
CREATE INDEX IF NOT EXISTS oauth_code_uses_used_at_idx 
  ON public.oauth_code_uses (used_at);

-- Function to auto-delete old OAuth codes (they expire after 10 minutes anyway)
CREATE OR REPLACE FUNCTION cleanup_old_oauth_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM public.oauth_code_uses 
  WHERE used_at < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;

-- Ensure a phone number can only be linked once per workspace
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_accounts_workspace_phone_uidx
  ON public.whatsapp_accounts (workspace_id, phone_number_id);