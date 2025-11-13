-- Add INSERT policy for ai_action_log (for edge functions to log)
CREATE POLICY "Service role can insert action logs"
  ON public.ai_action_log FOR INSERT
  TO authenticated
  WITH CHECK (true);