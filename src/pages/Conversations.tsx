import { useState, useEffect } from "react";
import { Search, Send, Paperclip, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import GlobalControls from "@/components/automations/GlobalControls";
import { NewConversationDialog } from "@/components/conversations/NewConversationDialog";

interface Conversation {
  id: string;
  customer_name: string;
  customer_phone: string;
  last_message_at: string;
  status: string;
  messages?: Message[];
}

interface Message {
  id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  created_at: string;
  from_number: string;
  message_type: string;
}

export default function Conversations() {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [newConversationOpen, setNewConversationOpen] = useState(false);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  // Fetch conversations
  useEffect(() => {
    if (!workspaceId) return;

    const fetchConversations = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        toast({
          title: "Error loading conversations",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setConversations(data || []);
        if (data && data.length > 0 && !selectedConversationId) {
          setSelectedConversationId(data[0].id);
        }
      }
      setIsLoading(false);
    };

    fetchConversations();

    // Subscribe to new conversations
    const conversationsChannel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          console.log('Conversation change:', payload);
          if (payload.eventType === 'INSERT') {
            setConversations((prev) => [payload.new as Conversation, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setConversations((prev) =>
              prev.map((c) => (c.id === payload.new.id ? payload.new as Conversation : c))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
    };
  }, [workspaceId, toast]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversationId) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        toast({
          title: "Error loading messages",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setMessages((data || []) as Message[]);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`messages-${selectedConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        (payload) => {
          console.log('New message:', payload);
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedConversationId, toast]);

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedConversationId || isSending) return;

    setIsSending(true);
    const messageContent = message;
    setMessage("");

    try {
      const { error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          conversation_id: selectedConversationId,
          content: messageContent,
        },
      });

      if (error) throw error;

      toast({
        title: "Message sent",
        description: "Your message was delivered successfully",
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
      setMessage(messageContent); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading conversations...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No conversations yet</p>
          <Button onClick={() => setNewConversationOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Start New Conversation
          </Button>
        </div>
        <NewConversationDialog
          open={newConversationOpen}
          onOpenChange={setNewConversationOpen}
          onConversationCreated={(id) => setSelectedConversationId(id)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Workflow Controls */}
      <GlobalControls />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation List */}
        <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Conversations</h2>
            <Button 
              size="sm" 
              onClick={() => setNewConversationOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search conversations..." className="pl-9" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="divide-y divide-border">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversationId(conv.id)}
                className={`
                  w-full p-4 text-left transition-colors
                  ${selectedConversationId === conv.id ? "bg-accent" : "hover:bg-muted"}
                `}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {conv.customer_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || "?"}
                    </span>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">
                        {conv.customer_name || conv.customer_phone}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {conv.last_message_at
                          ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })
                          : ""}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{conv.customer_phone}</p>
                    <div className="mt-2">
                      <span className={`status-pill status-${conv.status}`}>
                        {conv.status}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="h-14 border-b border-border px-6 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">
                {selectedConversation.customer_name || "Unknown"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {selectedConversation.customer_phone}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Create Order
              </Button>
              <Button variant="outline" size="sm">
                Send Pay Link
              </Button>
              <Button variant="outline" size="sm">
                Insert SKU
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4 max-w-3xl">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.direction === 'outbound' ? 'justify-end' : ''}`}
                >
                  {msg.direction === 'inbound' && (
                    <Avatar className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs">
                        {selectedConversation.customer_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2) || "?"}
                      </span>
                    </Avatar>
                  )}
                  <div className={`flex-1 ${msg.direction === 'outbound' ? 'flex flex-col items-end' : ''}`}>
                    <div
                      className={`rounded-lg p-3 inline-block max-w-md ${
                        msg.direction === 'outbound'
                          ? 'bg-foreground text-background'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Composer */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSending}
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={!message.trim() || isSending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                Insert Product
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                Template
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                Attach Invoice
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Select a conversation to start
        </div>
      )}
      </div>
      
      <NewConversationDialog
        open={newConversationOpen}
        onOpenChange={setNewConversationOpen}
        onConversationCreated={(id) => setSelectedConversationId(id)}
      />
    </div>
  );
}
