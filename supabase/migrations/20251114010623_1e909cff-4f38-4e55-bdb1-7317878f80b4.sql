-- Add archived status to conversations table
-- The status field already exists, but let's ensure 'archived' is a valid value
-- Also add an archived_at timestamp for tracking

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Add index for better query performance when filtering archived conversations
CREATE INDEX IF NOT EXISTS idx_conversations_status_archived 
ON conversations(workspace_id, status, archived_at DESC)
WHERE status IN ('open', 'archived');

-- Update RLS policies to handle archived conversations
-- Users should be able to archive and view their archived conversations
-- (Existing RLS policies already allow all operations, so no changes needed)