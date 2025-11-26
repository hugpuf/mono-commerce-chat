-- Create agent_evaluations table for tracking AI performance
CREATE TABLE IF NOT EXISTS public.agent_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  
  -- Input context
  input_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected structure: { customerMessage, bufferSize, messageType }
  
  -- Processing context
  processing_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected structure: { conversationHistory, aiMode, productCount, settings }
  
  -- Output context
  output_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected structure: { finalAnswer, confidence, toolCalls[], processingTime }
  
  -- Evaluation metadata
  evaluation_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected structure: { sentiment, guardrailViolations[], escalationMatches[], complianceResults }
  
  -- Evaluation results (populated by n8n)
  evaluation_scores JSONB DEFAULT NULL,
  -- Expected structure: { overallScore, relevance, accuracy, coherence, feedback }
  
  evaluation_status TEXT NOT NULL DEFAULT 'pending' CHECK (evaluation_status IN ('pending', 'completed', 'failed')),
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX idx_agent_evaluations_workspace ON public.agent_evaluations(workspace_id);
CREATE INDEX idx_agent_evaluations_conversation ON public.agent_evaluations(conversation_id);
CREATE INDEX idx_agent_evaluations_status ON public.agent_evaluations(evaluation_status) WHERE evaluation_status = 'pending';
CREATE INDEX idx_agent_evaluations_created_at ON public.agent_evaluations(created_at DESC);

-- Add GIN indexes for JSONB queries
CREATE INDEX idx_agent_evaluations_input_context ON public.agent_evaluations USING GIN(input_context);
CREATE INDEX idx_agent_evaluations_output_context ON public.agent_evaluations USING GIN(output_context);
CREATE INDEX idx_agent_evaluations_scores ON public.agent_evaluations USING GIN(evaluation_scores);

-- Enable RLS
ALTER TABLE public.agent_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can view evaluations in their workspace
CREATE POLICY "Users can view own workspace evaluations"
  ON public.agent_evaluations
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.user_profiles WHERE user_id = auth.uid()
    )
  );

-- RLS policy: Service role can insert evaluations (from edge function)
CREATE POLICY "Service role can insert evaluations"
  ON public.agent_evaluations
  FOR INSERT
  WITH CHECK (true);

-- RLS policy: Service role can update evaluation results (from n8n webhook)
CREATE POLICY "Service role can update evaluations"
  ON public.agent_evaluations
  FOR UPDATE
  USING (true);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_agent_evaluations_updated_at
  BEFORE UPDATE ON public.agent_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.agent_evaluations IS 'Stores complete AI agent evaluation context for performance monitoring and improvement';
COMMENT ON COLUMN public.agent_evaluations.input_context IS 'Customer message and buffer context';
COMMENT ON COLUMN public.agent_evaluations.processing_context IS 'Conversation history and AI settings used';
COMMENT ON COLUMN public.agent_evaluations.output_context IS 'AI response, confidence, and tool calls';
COMMENT ON COLUMN public.agent_evaluations.evaluation_metadata IS 'Sentiment, guardrails, escalations, compliance checks';
COMMENT ON COLUMN public.agent_evaluations.evaluation_scores IS 'Populated by n8n evaluation workflow';