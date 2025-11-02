-- Add SELECT policy for oauth_states (edge functions read via service role, but we need this for completeness)
CREATE POLICY "Service role can read oauth_states"
ON public.oauth_states
FOR SELECT
TO authenticated
USING (true);
