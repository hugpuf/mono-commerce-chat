import { useState, useRef, useEffect } from "react";
import { Search, Send, Settings, ArrowDown, MessageSquarePlus, Phone, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageGroup } from "@/components/conversations/MessageGroup";
import { AutoResizeTextarea } from "@/components/conversations/AutoResizeTextarea";
import { WorkflowSettingsDialog } from "@/components/conversations/WorkflowSettingsDialog";
import { NewConversationDialogDemo } from "@/components/conversations/NewConversationDialogDemo";
import { TypingIndicator } from "@/components/conversations/TypingIndicator";
import { ConnectionStatus } from "@/components/conversations/ConnectionStatus";
import { mockConversations, mockMessages, MockConversation, MockMessage } from "@/data/mockConversations";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";

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
  const [allMessages, setAllMessages] = useState<Record<string, MockMessage[]>>(mockMessages);
  const [messages, setMessages] = useState<MockMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [workflowSettingsOpen, setWorkflowSettingsOpen] = useState(false);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "open" | "closed">("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "disconnected">("connecting");
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Simulate connection status
  useEffect(() => {
    const timer = setTimeout(() => {
      setConnectionStatus("connected");
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Simulate typing indicator (randomly for demo)
  useEffect(() => {
    if (!selectedConversation) return;

    const showTyping = () => {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    };

    const interval = setInterval(() => {
      if (Math.random() > 0.85) {
        showTyping();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      const conversationMessages = allMessages[selectedConversation.id] || [];
      setMessages(conversationMessages);
      
      // Mark as read
      setConversations(prev => prev.map(conv => 
        conv.id === selectedConversation.id 
          ? { ...conv, unread_count: 0 }
          : conv
      ));
      
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [selectedConversation, allMessages]);

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

    setAllMessages(prev => ({
      ...prev,
      [selectedConversation.id]: [...(prev[selectedConversation.id] || []), newMsg]
    }));
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

  const handleCreateConversation = (data: { phone: string; name: string; initialMessage: string }) => {
    const newConvId = `conv_${Date.now()}`;
    const newConv: MockConversation = {
      id: newConvId,
      customer_name: data.name,
      customer_phone: `+${data.phone}`,
      last_message_preview: data.initialMessage,
      last_message_at: new Date().toISOString(),
      unread_count: 0,
      status: "open",
    };

    const newMsg: MockMessage = {
      id: `msg_${Date.now()}`,
      content: data.initialMessage,
      direction: "outbound",
      created_at: new Date().toISOString(),
      status: "sent",
    };

    setConversations(prev => [newConv, ...prev]);
    setAllMessages(prev => ({ ...prev, [newConvId]: [newMsg] }));
    setSelectedConversation(newConv);
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

  const filteredConversations = conversations.filter((conv) => {
    // Search filter
    const matchesSearch = conv.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.customer_phone.includes(searchQuery);
    
    // Status filter
    const matchesStatus = filterTab === "all" || conv.status === filterTab;
    
    // Unread filter
    const matchesUnread = !showUnreadOnly || conv.unread_count > 0;
    
    return matchesSearch && matchesStatus && matchesUnread;
  });

  const groupedMessages = groupMessages(messages);

  return (
    <div className="flex h-screen bg-background">
      {/* Conversations List */}
      <div className="w-80 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Conversations</h2>
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="sm"
                onClick={() => setNewConversationOpen(true)}
              >
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                New
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setWorkflowSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filter Tabs */}
          <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                All
                {conversations.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {conversations.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="open" className="flex-1">
                Open
                {conversations.filter(c => c.status === 'open').length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {conversations.filter(c => c.status === 'open').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="closed" className="flex-1">
                Closed
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search and Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showUnreadOnly ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            >
              {showUnreadOnly ? "Show All" : "Unread Only"}
              {showUnreadOnly && conversations.filter(c => c.unread_count > 0).length > 0 && (
                <Badge variant="default" className="ml-auto h-5 px-1.5 text-xs">
                  {conversations.filter(c => c.unread_count > 0).length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <MessageSquarePlus className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No conversations found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || showUnreadOnly 
                  ? "Try adjusting your filters" 
                  : "Start a new conversation to get going"}
              </p>
              {!searchQuery && !showUnreadOnly && (
                <Button onClick={() => setNewConversationOpen(true)}>
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              )}
            </div>
          ) : (
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
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedConversation.customer_name}`} />
                    <AvatarFallback>{selectedConversation.customer_name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedConversation.customer_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.customer_phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ConnectionStatus status={connectionStatus} />
                  <Button variant="ghost" size="icon">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
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
                
                {/* Typing Indicator */}
                {isTyping && <TypingIndicator customerName={selectedConversation.customer_name} />}
                
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
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquarePlus className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No conversation selected</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Choose a conversation from the list or start a new one to begin messaging
            </p>
            <Button onClick={() => setNewConversationOpen(true)}>
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              Start New Conversation
            </Button>
          </div>
        )}
      </div>

      <WorkflowSettingsDialog
        open={workflowSettingsOpen}
        onOpenChange={setWorkflowSettingsOpen}
      />

      <NewConversationDialogDemo
        open={newConversationOpen}
        onOpenChange={setNewConversationOpen}
        onCreateConversation={handleCreateConversation}
      />
    </div>
  );
}
