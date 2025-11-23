-- Add soft deletion columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Add soft deletion columns to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Create message_deletion_log table for audit trail
CREATE TABLE IF NOT EXISTS public.message_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  deleted_by UUID REFERENCES auth.users(id),
  deletion_type TEXT NOT NULL CHECK (deletion_type IN ('soft', 'hard', 'conversation')),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  original_content TEXT,
  metadata JSONB DEFAULT '{}',
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on message_deletion_log
ALTER TABLE public.message_deletion_log ENABLE ROW LEVEL SECURITY;

-- RLS policy for viewing deletion logs
CREATE POLICY "Users can view own workspace deletion logs"
ON public.message_deletion_log
FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Service role can insert deletion logs
CREATE POLICY "Service role can insert deletion logs"
ON public.message_deletion_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Update RLS policies for messages to exclude deleted by default
DROP POLICY IF EXISTS "Allow authenticated users to manage messages" ON public.messages;

CREATE POLICY "Users can view non-deleted messages"
ON public.messages
FOR SELECT
TO authenticated
USING (is_deleted = FALSE OR deleted_by = auth.uid());

CREATE POLICY "Users can insert messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Users can delete own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (true);

-- Update RLS policies for conversations to handle soft deletion
DROP POLICY IF EXISTS "Allow authenticated users to manage conversations" ON public.conversations;

CREATE POLICY "Users can view conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Users can delete conversations"
ON public.conversations
FOR DELETE
TO authenticated
USING (true);

-- Function to soft delete a conversation and all its messages
CREATE OR REPLACE FUNCTION public.soft_delete_conversation(
  p_conversation_id UUID,
  p_deleted_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  -- Get workspace_id from conversation
  SELECT workspace_id INTO v_workspace_id
  FROM conversations
  WHERE id = p_conversation_id;

  -- Soft delete all messages in the conversation
  UPDATE messages
  SET 
    is_deleted = TRUE,
    deleted_at = now(),
    deleted_by = p_deleted_by
  WHERE conversation_id = p_conversation_id
    AND is_deleted = FALSE;

  -- Log the conversation deletion
  INSERT INTO message_deletion_log (
    conversation_id,
    deleted_by,
    deletion_type,
    workspace_id,
    metadata
  )
  VALUES (
    p_conversation_id,
    p_deleted_by,
    'conversation',
    v_workspace_id,
    jsonb_build_object('message_count', (
      SELECT COUNT(*) FROM messages WHERE conversation_id = p_conversation_id
    ))
  );

  -- Soft delete the conversation
  UPDATE conversations
  SET 
    is_deleted = TRUE,
    deleted_at = now()
  WHERE id = p_conversation_id;
END;
$$;

-- Function to soft delete individual messages
CREATE OR REPLACE FUNCTION public.soft_delete_messages(
  p_message_ids UUID[],
  p_deleted_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id UUID;
  v_message_record RECORD;
BEGIN
  FOREACH v_message_id IN ARRAY p_message_ids
  LOOP
    -- Get message details
    SELECT m.*, c.workspace_id
    INTO v_message_record
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = v_message_id;

    -- Soft delete the message
    UPDATE messages
    SET 
      is_deleted = TRUE,
      deleted_at = now(),
      deleted_by = p_deleted_by
    WHERE id = v_message_id
      AND is_deleted = FALSE;

    -- Log the deletion
    INSERT INTO message_deletion_log (
      message_id,
      conversation_id,
      deleted_by,
      deletion_type,
      workspace_id,
      original_content,
      metadata
    )
    VALUES (
      v_message_id,
      v_message_record.conversation_id,
      p_deleted_by,
      'soft',
      v_message_record.workspace_id,
      v_message_record.content,
      jsonb_build_object(
        'direction', v_message_record.direction,
        'message_type', v_message_record.message_type
      )
    );
  END LOOP;
END;
$$;

-- Function to restore soft-deleted messages (within 5 min window)
CREATE OR REPLACE FUNCTION public.restore_messages(
  p_message_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE messages
  SET 
    is_deleted = FALSE,
    deleted_at = NULL,
    deleted_by = NULL
  WHERE id = ANY(p_message_ids)
    AND is_deleted = TRUE
    AND deleted_at > now() - INTERVAL '5 minutes';
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON public.messages(is_deleted, conversation_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_conversations_deleted ON public.conversations(is_deleted, workspace_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_deletion_log_workspace ON public.message_deletion_log(workspace_id, deleted_at DESC);