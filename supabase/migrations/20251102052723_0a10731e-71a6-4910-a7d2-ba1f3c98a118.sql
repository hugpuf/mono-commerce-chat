-- Add workspace_id column to oauth_states table
ALTER TABLE public.oauth_states ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_workspace_id ON public.oauth_states (workspace_id);

-- Add automatic cleanup for old states (older than 10 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_old_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.oauth_states 
  WHERE created_at < NOW() - INTERVAL '10 minutes';
END;
$$;
