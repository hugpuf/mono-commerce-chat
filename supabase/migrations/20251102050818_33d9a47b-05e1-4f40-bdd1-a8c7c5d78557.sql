-- Create table to persist exact redirect_uri used at OAuth launch
CREATE TABLE IF NOT EXISTS public.oauth_states (
  state TEXT PRIMARY KEY,
  redirect_uri TEXT NOT NULL,
  app_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- Allow inserts from authenticated users (edge functions bypass RLS with service role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'oauth_states' 
      AND policyname = 'Authenticated can insert oauth_states'
  ) THEN
    CREATE POLICY "Authenticated can insert oauth_states"
    ON public.oauth_states
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Optional: prevent selects by clients (no SELECT policy). Edge functions can read via service role.

-- Helpful index for cleanup/lookup
CREATE INDEX IF NOT EXISTS idx_oauth_states_created_at ON public.oauth_states (created_at DESC);
