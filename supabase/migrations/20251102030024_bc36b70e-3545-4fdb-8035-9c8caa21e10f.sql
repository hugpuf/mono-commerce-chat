-- Add unique index to prevent duplicate OAuth code usage
CREATE UNIQUE INDEX IF NOT EXISTS ux_oauth_code_uses_provider_code 
ON public.oauth_code_uses (provider, code);

-- Drop the overly permissive policy on whatsapp_accounts
DROP POLICY IF EXISTS "Allow authenticated users to manage whatsapp_accounts" ON public.whatsapp_accounts;

-- Create workspace-scoped RLS policies for whatsapp_accounts
CREATE POLICY "Users can read own workspace whatsapp accounts"
ON public.whatsapp_accounts
FOR SELECT
USING (
  workspace_id IN (
    SELECT user_profiles.workspace_id
    FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own workspace whatsapp accounts"
ON public.whatsapp_accounts
FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT user_profiles.workspace_id
    FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own workspace whatsapp accounts"
ON public.whatsapp_accounts
FOR UPDATE
USING (
  workspace_id IN (
    SELECT user_profiles.workspace_id
    FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own workspace whatsapp accounts"
ON public.whatsapp_accounts
FOR DELETE
USING (
  workspace_id IN (
    SELECT user_profiles.workspace_id
    FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
  )
);