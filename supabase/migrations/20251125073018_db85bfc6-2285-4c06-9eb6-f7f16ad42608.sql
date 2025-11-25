-- Fix try_conversation_lock to properly convert UUID to bigint
CREATE OR REPLACE FUNCTION public.try_conversation_lock(p_conversation_id uuid, p_instance_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  lock_key BIGINT;
  lock_acquired BOOLEAN;
BEGIN
  -- Convert UUID to a consistent integer for advisory lock (remove hyphens first!)
  lock_key := ('x' || substr(replace(p_conversation_id::text, '-', ''), 1, 15))::bit(60)::bigint;
  
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
$function$;

-- Fix release_conversation_lock to properly convert UUID to bigint
CREATE OR REPLACE FUNCTION public.release_conversation_lock(p_conversation_id uuid, p_instance_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Convert UUID to the same integer used for locking (remove hyphens first!)
  lock_key := ('x' || substr(replace(p_conversation_id::text, '-', ''), 1, 15))::bit(60)::bigint;
  
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
$function$;

-- Fix unlock_stuck_conversations to properly convert UUID to bigint
CREATE OR REPLACE FUNCTION public.unlock_stuck_conversations()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Convert UUID to lock key (remove hyphens first!)
    lock_key := ('x' || substr(replace(stuck_conversation.id::text, '-', ''), 1, 15))::bit(60)::bigint;
    
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
$function$;

-- Clean up duplicate messages
DELETE FROM messages 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY whatsapp_message_id 
      ORDER BY created_at ASC
    ) as rn
    FROM messages
    WHERE whatsapp_message_id IS NOT NULL
  ) sub
  WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_whatsapp_message_id_unique 
ON messages(whatsapp_message_id) 
WHERE whatsapp_message_id IS NOT NULL;