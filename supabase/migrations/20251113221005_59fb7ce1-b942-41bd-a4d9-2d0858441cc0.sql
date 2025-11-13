-- Create workspace_ai_settings table
CREATE TABLE IF NOT EXISTS public.workspace_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'manual' CHECK (mode IN ('manual', 'hitl', 'auto')),
  confidence_threshold NUMERIC NOT NULL DEFAULT 0.7 CHECK (confidence_threshold >= 0 AND confidence_threshold <= 1),
  ai_voice TEXT,
  dos TEXT,
  donts TEXT,
  escalation_rules TEXT,
  quiet_hours JSONB DEFAULT '[]'::jsonb,
  compliance_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Create ai_pending_approvals table
CREATE TABLE IF NOT EXISTS public.ai_pending_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_payload JSONB NOT NULL,
  ai_reasoning TEXT,
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Create ai_action_log table
CREATE TABLE IF NOT EXISTS public.ai_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_payload JSONB NOT NULL,
  confidence_score NUMERIC,
  mode TEXT NOT NULL,
  execution_method TEXT NOT NULL CHECK (execution_method IN ('auto', 'approved', 'manual')),
  result TEXT NOT NULL CHECK (result IN ('success', 'failed', 'rejected')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workspace_ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_pending_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspace_ai_settings
CREATE POLICY "Users can read own workspace AI settings"
  ON public.workspace_ai_settings FOR SELECT
  TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own workspace AI settings"
  ON public.workspace_ai_settings FOR UPDATE
  TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own workspace AI settings"
  ON public.workspace_ai_settings FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.user_profiles WHERE user_id = auth.uid()
  ));

-- RLS Policies for ai_pending_approvals
CREATE POLICY "Users can read own workspace approvals"
  ON public.ai_pending_approvals FOR SELECT
  TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own workspace approvals"
  ON public.ai_pending_approvals FOR UPDATE
  TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.user_profiles WHERE user_id = auth.uid()
  ));

-- RLS Policies for ai_action_log
CREATE POLICY "Users can read own workspace action logs"
  ON public.ai_action_log FOR SELECT
  TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.user_profiles WHERE user_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX idx_workspace_ai_settings_workspace ON public.workspace_ai_settings(workspace_id);
CREATE INDEX idx_ai_pending_approvals_workspace ON public.ai_pending_approvals(workspace_id);
CREATE INDEX idx_ai_pending_approvals_status ON public.ai_pending_approvals(status);
CREATE INDEX idx_ai_pending_approvals_conversation ON public.ai_pending_approvals(conversation_id);
CREATE INDEX idx_ai_action_log_workspace ON public.ai_action_log(workspace_id);
CREATE INDEX idx_ai_action_log_created_at ON public.ai_action_log(created_at DESC);

-- Trigger to update updated_at on workspace_ai_settings
CREATE TRIGGER update_workspace_ai_settings_updated_at
  BEFORE UPDATE ON public.workspace_ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on ai_pending_approvals
CREATE TRIGGER update_ai_pending_approvals_updated_at
  BEFORE UPDATE ON public.ai_pending_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();