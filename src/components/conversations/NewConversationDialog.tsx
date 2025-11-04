import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string) => void;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onConversationCreated,
}: NewConversationDialogProps) {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleStartConversation = async () => {
    if (!phoneNumber || !initialMessage) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Phone number and message are required",
      });
      return;
    }

    // Basic phone validation
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast({
        variant: "destructive",
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
      });
      return;
    }

    setIsSending(true);

    try {
      // Get WhatsApp account for this workspace
      const { data: whatsappAccount, error: whatsappError } = await supabase
        .from("whatsapp_accounts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .single();

      if (whatsappError || !whatsappAccount) {
        throw new Error("No active WhatsApp account found");
      }

      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          workspace_id: workspaceId,
          whatsapp_account_id: whatsappAccount.id,
          customer_phone: cleanPhone,
          customer_name: customerName || null,
          status: "open",
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (convError) throw convError;

      // Send initial message
      const { error: messageError } = await supabase.functions.invoke(
        "send-whatsapp-message",
        {
          body: {
            conversation_id: conversation.id,
            content: initialMessage,
          },
        }
      );

      if (messageError) throw messageError;

      toast({
        title: "Conversation started",
        description: "Message sent successfully",
      });

      // Reset form
      setPhoneNumber("");
      setCustomerName("");
      setInitialMessage("");
      onOpenChange(false);
      onConversationCreated(conversation.id);
    } catch (error: any) {
      console.error("Error starting conversation:", error);
      toast({
        variant: "destructive",
        title: "Failed to start conversation",
        description: error.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
          <DialogDescription>
            Send a message to start a new WhatsApp conversation with a customer
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isSending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Customer Name (Optional)</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={isSending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Initial Message *</Label>
            <Textarea
              id="message"
              placeholder="Hi! How can I help you today?"
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              disabled={isSending}
              rows={4}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button onClick={handleStartConversation} disabled={isSending}>
            {isSending ? "Sending..." : "Send Message"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
