-- Add cancellation tracking to catalog_sources
ALTER TABLE catalog_sources 
ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamp with time zone DEFAULT NULL;

-- Add cancelled status to sync_status check
ALTER TABLE catalog_sources 
DROP CONSTRAINT IF EXISTS catalog_sources_sync_status_check;

ALTER TABLE catalog_sources 
ADD CONSTRAINT catalog_sources_sync_status_check 
CHECK (sync_status IN ('idle', 'syncing', 'success', 'error', 'cancelled'));