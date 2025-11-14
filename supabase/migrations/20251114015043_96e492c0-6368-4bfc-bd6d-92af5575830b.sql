-- Create guardrail_rules table
CREATE TABLE public.guardrail_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'keyword', 'sentiment', 'intent', 'length', 'pattern'
  condition JSONB NOT NULL, -- structured condition logic
  enforcement TEXT NOT NULL DEFAULT 'warn', -- 'block', 'escalate', 'warn', 'modify'
  fallback_message TEXT,
  priority INTEGER NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create escalation_policies table
CREATE TABLE public.escalation_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  triggers JSONB NOT NULL, -- array of trigger conditions with thresholds
  routing JSONB NOT NULL, -- routing logic (notify users, channels, etc.)
  behavior JSONB NOT NULL, -- what happens (queue, block, require_approval, etc.)
  priority INTEGER NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create business_hours_config table
CREATE TABLE public.business_hours_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  schedule JSONB NOT NULL, -- array of daily schedules with start/end times
  holidays JSONB DEFAULT '[]'::jsonb, -- array of holiday dates
  out_of_hours_behavior JSONB NOT NULL, -- what to do outside business hours
  enabled BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create compliance_checks table
CREATE TABLE public.compliance_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  check_type TEXT NOT NULL, -- 'keyword', 'pattern', 'disclosure', 'consent', 'data_privacy'
  validation JSONB NOT NULL, -- validation logic and patterns
  trigger_conditions JSONB, -- when this check should run
  enforcement TEXT NOT NULL DEFAULT 'suggestion', -- 'required', 'suggestion', 'warning'
  compliance_text TEXT, -- text to inject if missing
  priority INTEGER NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_guardrail_rules_workspace ON public.guardrail_rules(workspace_id) WHERE enabled = true;
CREATE INDEX idx_escalation_policies_workspace ON public.escalation_policies(workspace_id) WHERE enabled = true;
CREATE INDEX idx_business_hours_config_workspace ON public.business_hours_config(workspace_id);
CREATE INDEX idx_compliance_checks_workspace ON public.compliance_checks(workspace_id) WHERE enabled = true;

-- Add updated_at triggers
CREATE TRIGGER update_guardrail_rules_updated_at
  BEFORE UPDATE ON public.guardrail_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_escalation_policies_updated_at
  BEFORE UPDATE ON public.escalation_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_hours_config_updated_at
  BEFORE UPDATE ON public.business_hours_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_checks_updated_at
  BEFORE UPDATE ON public.compliance_checks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.guardrail_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;

-- guardrail_rules policies
CREATE POLICY "Users can manage own workspace guardrail rules"
  ON public.guardrail_rules
  FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM user_profiles WHERE user_id = auth.uid()
  ));

-- escalation_policies policies
CREATE POLICY "Users can manage own workspace escalation policies"
  ON public.escalation_policies
  FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM user_profiles WHERE user_id = auth.uid()
  ));

-- business_hours_config policies
CREATE POLICY "Users can manage own workspace business hours"
  ON public.business_hours_config
  FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM user_profiles WHERE user_id = auth.uid()
  ));

-- compliance_checks policies
CREATE POLICY "Users can manage own workspace compliance checks"
  ON public.compliance_checks
  FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM user_profiles WHERE user_id = auth.uid()
  ));