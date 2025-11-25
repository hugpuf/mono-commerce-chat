-- Add conversation locking and message buffering support
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS is_processing BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS message_buffer JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS lock_acquired_by TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversations_is_processing 
ON conversations(workspace_id, is_processing) 
WHERE is_processing = true;

-- Add comments for documentation
COMMENT ON COLUMN conversations.is_processing IS 'Lock flag to prevent concurrent processing of messages';
COMMENT ON COLUMN conversations.message_buffer IS 'Temporary buffer for messages that arrive during processing';
COMMENT ON COLUMN conversations.lock_acquired_by IS 'Instance ID that acquired the lock for verification';

-- Create advisory lock functions using conversation ID hash
CREATE OR REPLACE FUNCTION try_conversation_lock(p_conversation_id UUID, p_instance_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lock_key BIGINT;
  lock_acquired BOOLEAN;
BEGIN
  -- Convert UUID to a consistent integer for advisory lock
  lock_key := ('x' || substr(p_conversation_id::text, 1, 15))::bit(60)::bigint;
  
  -- Try to acquire the advisory lock
  lock_acquired := pg_try_advisory_lock(lock_key);
  
  IF lock_acquired THEN
    -- Update conversation record with lock info
    UPDATE conversations
    SET 
      is_processing = TRUE,
      processing_started_at = now(),
      lock_acquired_by = p_instance_id
    WHERE id = p_conversation_id;
  END IF;
  
  RETURN lock_acquired;
END;
$$;

CREATE OR REPLACE FUNCTION release_conversation_lock(p_conversation_id UUID, p_instance_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lock_key BIGINT;
  current_lock_owner TEXT;
BEGIN
  -- Verify lock ownership
  SELECT lock_acquired_by INTO current_lock_owner
  FROM conversations
  WHERE id = p_conversation_id;
  
  IF current_lock_owner IS NULL OR current_lock_owner != p_instance_id THEN
    RAISE WARNING 'Lock ownership mismatch for conversation %', p_conversation_id;
    RETURN FALSE;
  END IF;
  
  -- Convert UUID to the same integer used for locking
  lock_key := ('x' || substr(p_conversation_id::text, 1, 15))::bit(60)::bigint;
  
  -- Release the advisory lock
  PERFORM pg_advisory_unlock(lock_key);
  
  -- Clear conversation lock state
  UPDATE conversations
  SET 
    is_processing = FALSE,
    processing_started_at = NULL,
    message_buffer = '[]',
    lock_acquired_by = NULL
  WHERE id = p_conversation_id;
  
  RETURN TRUE;
END;
$$;

-- Safety function to unlock stuck conversations (older than 60 seconds)
CREATE OR REPLACE FUNCTION unlock_stuck_conversations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  unlocked_count INTEGER := 0;
  stuck_conversation RECORD;
  lock_key BIGINT;
BEGIN
  FOR stuck_conversation IN
    SELECT id, lock_acquired_by
    FROM conversations
    WHERE is_processing = TRUE
      AND processing_started_at < now() - INTERVAL '60 seconds'
  LOOP
    -- Convert UUID to lock key
    lock_key := ('x' || substr(stuck_conversation.id::text, 1, 15))::bit(60)::bigint;
    
    -- Force unlock
    PERFORM pg_advisory_unlock(lock_key);
    
    -- Clear state
    UPDATE conversations
    SET 
      is_processing = FALSE,
      processing_started_at = NULL,
      message_buffer = '[]',
      lock_acquired_by = NULL
    WHERE id = stuck_conversation.id;
    
    unlocked_count := unlocked_count + 1;
    
    RAISE WARNING 'Unlocked stuck conversation %', stuck_conversation.id;
  END LOOP;
  
  RETURN unlocked_count;
END;
$$;