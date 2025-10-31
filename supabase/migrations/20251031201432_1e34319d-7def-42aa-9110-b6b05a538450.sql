-- Create data_deletion_requests table
CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deletion_type TEXT NOT NULL CHECK (deletion_type IN ('selective', 'full')),
  deletion_scope JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  confirmation_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add soft delete columns to workspaces
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

-- Enable RLS on data_deletion_requests
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for data_deletion_requests
CREATE POLICY "Users can view own workspace deletion requests"
ON public.data_deletion_requests FOR SELECT
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM user_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create deletion requests"
ON public.data_deletion_requests FOR INSERT
TO authenticated
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM user_profiles WHERE user_id = auth.uid()
));

-- Create updated_at trigger for data_deletion_requests
CREATE TRIGGER update_data_deletion_requests_updated_at
BEFORE UPDATE ON public.data_deletion_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for faster lookups
CREATE INDEX idx_data_deletion_requests_workspace_id 
ON public.data_deletion_requests(workspace_id);

CREATE INDEX idx_data_deletion_requests_confirmation_code 
ON public.data_deletion_requests(confirmation_code);

CREATE INDEX idx_workspaces_deleted_at 
ON public.workspaces(deleted_at) WHERE deleted_at IS NOT NULL;