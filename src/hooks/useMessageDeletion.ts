import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Provides soft-delete and restore helpers for messages and conversations.
 *
 * @returns API for soft-deleting messages, soft-deleting conversations, and restoring messages, plus loading flags.
 */
export function useMessageDeletion() {
  const { toast } = useToast();
  const [deletingMessages, setDeletingMessages] = useState<Set<string>>(new Set());
  const [deletingConversation, setDeletingConversation] = useState<string | null>(null);

  /**
   * Soft-delete specific messages for the current user.
   * @param messageIds IDs of the messages to delete.
   * @param userId ID of the user performing the delete (used for audit fields).
   * @param onUndo Optional callback to trigger UI-based undo flows.
   */
  const softDeleteMessages = async (messageIds: string[], userId: string, onUndo?: () => void) => {
    try {
      setDeletingMessages(prev => {
        const newSet = new Set(prev);
        messageIds.forEach(id => newSet.add(id));
        return newSet;
      });

      const { error } = await supabase.rpc('soft_delete_messages', {
        p_message_ids: messageIds,
        p_deleted_by: userId
      });

      if (error) throw error;

      // Show simple toast - component can handle undo UI
      toast({
        title: "Message deleted",
        description: "Message will be permanently deleted in 5 minutes",
      });

      return true;
    } catch (error) {
      console.error('Error deleting messages:', error);
      toast({
        title: "Error",
        description: "Failed to delete message. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setDeletingMessages(prev => {
        const newSet = new Set(prev);
        messageIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };

  /**
   * Soft-delete an entire conversation for the current user.
   * @param conversationId Conversation to delete.
   * @param userId ID of the user performing the delete.
   */
  const softDeleteConversation = async (conversationId: string, userId: string) => {
    try {
      setDeletingConversation(conversationId);

      const { error } = await supabase.rpc('soft_delete_conversation', {
        p_conversation_id: conversationId,
        p_deleted_by: userId
      });

      if (error) throw error;

      toast({
        title: "Conversation deleted",
        description: "The conversation has been removed.",
      });

      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setDeletingConversation(null);
    }
  };

  /**
   * Restore previously soft-deleted messages.
   * @param messageIds IDs to restore within the undo window.
   */
  const restoreMessages = async (messageIds: string[]) => {
    try {
      const { error } = await supabase.rpc('restore_messages', {
        p_message_ids: messageIds
      });

      if (error) throw error;

      toast({
        title: "Message restored",
        description: "The message has been restored.",
      });

      return true;
    } catch (error) {
      console.error('Error restoring messages:', error);
      toast({
        title: "Error",
        description: "Failed to restore message. The undo window may have expired.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    softDeleteMessages,
    softDeleteConversation,
    restoreMessages,
    deletingMessages,
    deletingConversation
  };
}
