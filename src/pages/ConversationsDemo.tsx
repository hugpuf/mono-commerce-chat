import { useState, useRef, useEffect } from "react";
import { Search, Send, Settings, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageGroup } from "@/components/conversations/MessageGroup";
import { AutoResizeTextarea } from "@/components/conversations/AutoResizeTextarea";
import { WorkflowSettingsDialog } from "@/components/conversations/WorkflowSettingsDialog";
import { mockConversations, mockMessages, MockConversation, MockMessage } from "@/data/mockConversations";
import { formatDistanceToNow } from "date-fns";

interface GroupedMessages {
  date: string;
  groups: {
    isOutbound: boolean;
    messages: MockMessage[];
  }[];
}

export default function ConversationsDemo() {
  const [selectedConversation, setSelectedConversation] = useState<MockConversation | null>(null);
  const [conversations, setConversations] = useState(mockConversations);
  const [messages, setMessages] = useState<MockMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [workflowSettingsOpen, setWorkflowSettingsOpen] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedConversation) {
      const conversationMessages = mockMessages[selectedConversation.id] || [];
      setMessages(conversationMessages);
      
      // Mark as read
      setConversations(prev => prev.map(conv => 
        conv.id === selectedConversation.id 
          ? { ...conv, unread_count: 0 }
          : conv
      ));
      
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [selectedConversation]);

  const scrollToBottom = (immediate = false) => {
    if (immediate) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const newMsg: MockMessage = {
      id: `m${Date.now()}`,
      content: newMessage,
      direction: 'outbound',
      created_at: new Date().toISOString(),
      status: 'sent'
    };

    setMessages(prev => [...prev, newMsg]);
    setNewMessage("");
    
    // Update conversation preview
    setConversations(prev => prev.map(conv => 
      conv.id === selectedConversation.id 
        ? { 
            ...conv, 
            last_message_at: new Date().toISOString(),
            last_message_preview: newMessage 
          }
        : conv
    ));

    setTimeout(() => scrollToBottom(), 100);
  };

  const groupMessages = (messages: MockMessage[]): GroupedMessages[] => {
    const grouped: GroupedMessages[] = [];
    let currentDate = "";
    let currentGroup: GroupedMessages | null = null;

    messages.forEach((msg) => {
      const msgDate = new Date(msg.created_at).toDateString();

      if (msgDate !== currentDate) {
        currentDate = msgDate;
        currentGroup = { date: msgDate, groups: [] };
        grouped.push(currentGroup);
      }

      if (currentGroup) {
        const lastGroup = currentGroup.groups[currentGroup.groups.length - 1];
        const isOutbound = msg.direction === "outbound";

        if (lastGroup && lastGroup.isOutbound === isOutbound) {
          lastGroup.messages.push(msg);
        } else {
          currentGroup.groups.push({
            isOutbound,
            messages: [msg],
          });
        }
      }
    });

    return grouped;
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.customer_phone.includes(searchQuery)
  );

  const groupedMessages = groupMessages(messages);

  return (
    <div className="flex h-screen bg-background">
      {/* Conversations List */}
      <div className="w-80 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Conversations (Demo)</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setWorkflowSettingsOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="divide-y divide-border">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                  selectedConversation?.id === conversation.id ? "bg-muted" : ""
                } ${conversation.unread_count > 0 ? "font-semibold" : ""}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium truncate">
                    {conversation.customer_name}
                  </span>
                  {conversation.unread_count > 0 && (
                    <Badge variant="default" className="ml-2 rounded-full px-2">
                      {conversation.unread_count}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate mb-1">
                  {conversation.last_message_preview}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(conversation.last_message_at), {
                    addSuffix: true,
                  })}
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedConversation.customer_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation.customer_phone}
                  </p>
                </div>
                <Badge variant={selectedConversation.status === "open" ? "default" : "secondary"}>
                  {selectedConversation.status}
                </Badge>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea 
              className="flex-1 p-4" 
              ref={messagesContainerRef}
              onScroll={handleScroll}
            >
              <div className="space-y-6 max-w-4xl mx-auto">
                {groupedMessages.map((dateGroup, idx) => (
                  <div key={idx}>
                    <div className="flex justify-center my-4">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {formatDateHeader(dateGroup.date)}
                      </span>
                    </div>
                    {dateGroup.groups.map((group, groupIdx) => (
                      <div key={groupIdx} className="mb-4">
                        <MessageGroup
                          messages={group.messages}
                          customerName={selectedConversation.customer_name}
                          isOutbound={group.isOutbound}
                        />
                      </div>
                    ))}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Scroll to Bottom Button */}
            {showScrollButton && (
              <div className="absolute bottom-24 right-8">
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full shadow-lg"
                  onClick={() => scrollToBottom()}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Message Composer */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex gap-2 items-end max-w-4xl mx-auto">
                <AutoResizeTextarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  maxHeight={200}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  size="icon"
                  className="flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">Select a conversation to start messaging</p>
              <p className="text-sm">This is a demo with sample data</p>
            </div>
          </div>
        )}
      </div>

      <WorkflowSettingsDialog
        open={workflowSettingsOpen}
        onOpenChange={setWorkflowSettingsOpen}
      />
    </div>
  );
}
