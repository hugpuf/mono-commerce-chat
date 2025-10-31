-- Create whatsapp_numbers table for extended phone number management
CREATE TABLE IF NOT EXISTS public.whatsapp_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_account_id UUID NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL UNIQUE,
  display_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'pending', 'disabled')),
  quality_rating TEXT DEFAULT 'high' CHECK (quality_rating IN ('high', 'medium', 'low')),
  is_flagged BOOLEAN DEFAULT false,
  messaging_limit_tier TEXT,
  daily_conversation_usage INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  profile_logo_url TEXT,
  profile_about TEXT,
  profile_business_hours JSONB,
  profile_website TEXT,
  profile_email TEXT,
  fallback_locale TEXT DEFAULT 'en',
  quiet_hours_config JSONB,
  assignment_rules JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create whatsapp_webhook_events table for event logging
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  whatsapp_account_id UUID REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivery_status TEXT NOT NULL DEFAULT 'success' CHECK (delivery_status IN ('success', 'failed', 'retry')),
  response_code INTEGER,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(event_id, whatsapp_account_id)
);

-- Create channel_policies table for per-workspace messaging rules
CREATE TABLE IF NOT EXISTS public.channel_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  enforce_24h_window BOOLEAN DEFAULT true,
  auto_convert_to_template BOOLEAN DEFAULT false,
  fallback_template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  allowed_consent_sources TEXT[] DEFAULT ARRAY['form','whatsapp','manual'],
  consent_expiry_days INTEGER DEFAULT 365,
  block_marketing_without_consent BOOLEAN DEFAULT true,
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_burst_behavior TEXT DEFAULT 'queue' CHECK (rate_limit_burst_behavior IN ('queue', 'reject')),
  auto_reply_out_of_hours BOOLEAN DEFAULT false,
  auto_reply_template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  auto_reply_first_touch BOOLEAN DEFAULT false,
  auto_reply_sla_breach BOOLEAN DEFAULT false,
  duplicate_purchase_lookback_hours INTEGER DEFAULT 24,
  enable_duplicate_guard BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_logs table for compliance tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  before_state JSONB,
  after_state JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Extend message_templates table
ALTER TABLE public.message_templates 
ADD COLUMN IF NOT EXISTS variables_schema JSONB,
ADD COLUMN IF NOT EXISTS quality_score TEXT CHECK (quality_score IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS meta_template_id TEXT;

-- Extend workspaces table
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS media_ttl_days INTEGER DEFAULT 30;

-- Enable RLS on new tables
ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for whatsapp_numbers
CREATE POLICY "Users can manage own workspace numbers"
  ON public.whatsapp_numbers
  FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.user_profiles WHERE user_id = auth.uid()
  ));

-- RLS policies for whatsapp_webhook_events
CREATE POLICY "Users can view own workspace webhook events"
  ON public.whatsapp_webhook_events
  FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.user_profiles WHERE user_id = auth.uid()
  ));

-- RLS policies for channel_policies
CREATE POLICY "Users can manage own workspace policies"
  ON public.channel_policies
  FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.user_profiles WHERE user_id = auth.uid()
  ));

-- RLS policies for audit_logs
CREATE POLICY "Users can view own workspace audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.user_profiles WHERE user_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_workspace ON public.whatsapp_numbers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_account ON public.whatsapp_numbers(whatsapp_account_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_workspace ON public.whatsapp_webhook_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received ON public.whatsapp_webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace ON public.audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- Create triggers for updated_at
CREATE TRIGGER update_whatsapp_numbers_updated_at
  BEFORE UPDATE ON public.whatsapp_numbers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_channel_policies_updated_at
  BEFORE UPDATE ON public.channel_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_workspace_id UUID,
  p_action TEXT,
  p_target_type TEXT,
  p_target_id UUID DEFAULT NULL,
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    workspace_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    before_state,
    after_state
  ) VALUES (
    p_workspace_id,
    auth.uid(),
    p_action,
    p_target_type,
    p_target_id,
    p_before_state,
    p_after_state
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;