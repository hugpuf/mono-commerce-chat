-- Add sync tracking columns to catalog_sources
ALTER TABLE catalog_sources 
ADD COLUMN IF NOT EXISTS products_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'success', 'error'));

-- Create integration_sync_logs table for audit trail
CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  catalog_source_id uuid NOT NULL REFERENCES catalog_sources(id) ON DELETE CASCADE,
  sync_type text NOT NULL CHECK (sync_type IN ('initial', 'manual', 'webhook', 'scheduled')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'failed')),
  products_synced integer DEFAULT 0,
  products_updated integer DEFAULT 0,
  products_deleted integer DEFAULT 0,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view own workspace sync logs
CREATE POLICY "Users can view own workspace sync logs"
ON integration_sync_logs
FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sync_logs_workspace ON integration_sync_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_catalog_source ON integration_sync_logs(catalog_source_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON integration_sync_logs(started_at DESC);