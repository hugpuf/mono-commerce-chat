import { useState, useEffect, useRef } from "react";
import { Search, Send, Paperclip, Plus, MoreVertical, Package, CreditCard, Tag, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek } from "date-fns";
import { NewConversationDialog } from "@/components/conversations/NewConversationDialog";
import { WorkflowSettingsPreview } from "@/components/conversations/WorkflowSettingsPreview";
import { MessageGroup } from "@/components/conversations/MessageGroup";
import { AutoResizeTextarea } from "@/components/conversations/AutoResizeTextarea";
import { PendingApprovalCard } from "@/components/conversations/PendingApprovalCard";
import { cn } from "@/lib/utils";

// WhatsApp Conversations Page

interface Conversation {
  id: string;
  customer_name: string;
  customer_phone: string;
  last_message_at: string;
  last_message_preview?: string;
  unread_count?: number;
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
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

interface GroupedMessages {
  date: string;
  messages: Message[][];
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
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  // Group messages by date and consecutive direction
  const groupMessages = (messages: Message[]): GroupedMessages[] => {
    const grouped: GroupedMessages[] = [];
    let currentDate = '';
    let currentGroup: Message[] = [];
    let currentDirection: 'inbound' | 'outbound' | null = null;

    messages.forEach((msg, index) => {
      const msgDate = format(new Date(msg.created_at), 'yyyy-MM-dd');
      
      if (msgDate !== currentDate) {
        if (currentGroup.length > 0) {
          const lastGroup = grouped[grouped.length - 1];
          if (lastGroup) {
            lastGroup.messages.push(currentGroup);
          }
          currentGroup = [];
        }
        currentDate = msgDate;
        grouped.push({ date: msgDate, messages: [] });
        currentDirection = null;
      }

      if (msg.direction !== currentDirection) {
        if (currentGroup.length > 0) {
          grouped[grouped.length - 1].messages.push(currentGroup);
        }
        currentGroup = [msg];
        currentDirection = msg.direction;
      } else {
        currentGroup.push(msg);
      }

      if (index === messages.length - 1 && currentGroup.length > 0) {
        grouped[grouped.length - 1].messages.push(currentGroup);
      }
    });

    return grouped;
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    if (isThisWeek(date)) return format(date, 'EEEE');
    return format(date, 'MMM d, yyyy');
  };

  // Auto-scroll to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Handle scroll to detect if user scrolled up
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messagesContainerRef.current]);

  // Scroll to bottom when new messages arrive or conversation changes
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(false);
    }
  }, [selectedConversationId]);

  useEffect(() => {
    if (messages.length > 0 && !showScrollButton) {
      scrollToBottom();
    }
  }, [messages.length]);

  // Mark conversation as read when opened
  useEffect(() => {
    if (selectedConversationId && selectedConversation?.unread_count && selectedConversation.unread_count > 0) {
      supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', selectedConversationId)
        .then(() => {
          setConversations(prev =>
            prev.map(c => c.id === selectedConversationId ? { ...c, unread_count: 0 } : c)
          );
        });
    }
  }, [selectedConversationId]);

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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">No conversations yet</h3>
            <p className="text-sm text-muted-foreground">
              Send a message to start a conversation, or receive messages from customers on WhatsApp
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button onClick={() => setNewConversationOpen(true)} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Start New Conversation
            </Button>
            <p className="text-xs text-muted-foreground">
              To receive messages, send a WhatsApp to: <span className="font-mono">+797978836739875</span>
            </p>
          </div>
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Workflow Settings Preview - Always Visible */}
      <WorkflowSettingsPreview />

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
          <div className="divide-y divide-border p-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversationId(conv.id)}
                className={cn(
                  "w-full p-4 text-left transition-all rounded-lg",
                  selectedConversationId === conv.id 
                    ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" 
                    : "hover:bg-muted"
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                    selectedConversationId === conv.id 
                      ? "bg-accent text-accent-foreground" 
                      : "bg-muted"
                  )}>
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
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={cn(
                          "font-medium text-sm truncate",
                          conv.unread_count && conv.unread_count > 0 && "font-bold"
                        )}>
                          {conv.customer_name || conv.customer_phone}
                        </span>
                        {conv.unread_count && conv.unread_count > 0 && (
                          <span className="flex-shrink-0 h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {conv.last_message_at
                          ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })
                          : ""}
                      </span>
                    </div>
                    <p className={cn(
                      "text-sm text-muted-foreground truncate",
                      conv.unread_count && conv.unread_count > 0 && "font-semibold text-foreground"
                    )}>
                      {conv.last_message_preview || conv.customer_phone}
                    </p>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem>
                    <Package className="h-4 w-4 mr-2" />
                    Create Order
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Send Pay Link
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Tag className="h-4 w-4 mr-2" />
                    Insert SKU
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 relative overflow-hidden">
            <div 
              className="h-full overflow-y-auto p-6" 
              ref={messagesContainerRef}
            >
              <div className="space-y-6 max-w-3xl mx-auto">
                {/* Pending Approvals */}
                {pendingApprovals.length > 0 && (
                  <div className="space-y-3 mb-6">
                    {pendingApprovals.map((approval) => (
                      <PendingApprovalCard
                        key={approval.id}
                        approval={approval}
                        onApprovalComplete={() => {
                          setPendingApprovals((prev) => prev.filter((a) => a.id !== approval.id));
                        }}
                      />
                    ))}
                  </div>
                )}

                {groupMessages(messages).map((group, groupIndex) => (
                  <div key={groupIndex}>
                    <div className="flex justify-center mb-4">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {formatDateHeader(group.date)}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {group.messages.map((messageGroup, msgGroupIndex) => (
                        <MessageGroup
                          key={msgGroupIndex}
                          messages={messageGroup}
                          customerName={selectedConversation.customer_name || ''}
                          isOutbound={messageGroup[0]?.direction === 'outbound'}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
            
            {/* Scroll to bottom button */}
            {showScrollButton && (
              <Button
                size="icon"
                className="absolute bottom-4 right-4 rounded-full shadow-lg"
                onClick={() => scrollToBottom()}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border p-4">
            <div className="flex items-end gap-2">
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <Paperclip className="h-4 w-4" />
              </Button>
              <AutoResizeTextarea
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isSending}
                className="flex-1"
                maxHeight={200}
              />
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={!message.trim() || isSending}
                className="flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Select a conversation to start
        </div>
      )}
      
      <NewConversationDialog
        open={newConversationOpen}
        onOpenChange={setNewConversationOpen}
        onConversationCreated={(id) => setSelectedConversationId(id)}
      />
      </div>
    </div>
  );
}
