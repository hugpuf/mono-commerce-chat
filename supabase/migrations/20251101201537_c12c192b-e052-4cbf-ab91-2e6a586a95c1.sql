-- Enable RLS on oauth_code_uses table
-- Note: This table is only accessed by edge functions with service role keys,
-- so RLS policies are not strictly necessary, but we enable it for security best practices
ALTER TABLE public.oauth_code_uses ENABLE ROW LEVEL SECURITY;

-- No policies needed since this table is only accessed by edge functions
-- Edge functions use service role key which bypasses RLS