import { useState } from "react";
import { Search, Plus, Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";

interface Conversation {
  id: string;
  customerName: string;
  lastMessage: string;
  timestamp: string;
  status: "New" | "Paying" | "Completed";
  unread: boolean;
}

const mockConversations: Conversation[] = [
  {
    id: "1",
    customerName: "Sarah Chen",
    lastMessage: "Do you have this in size 42?",
    timestamp: "2m ago",
    status: "New",
    unread: true,
  },
  {
    id: "2",
    customerName: "Michael Torres",
    lastMessage: "Payment link sent",
    timestamp: "15m ago",
    status: "Paying",
    unread: false,
  },
  {
    id: "3",
    customerName: "Emma Rodriguez",
    lastMessage: "Thank you!",
    timestamp: "1h ago",
    status: "Completed",
    unread: false,
  },
];

export default function Conversations() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    mockConversations[0]?.id || null
  );
  const [message, setMessage] = useState("");

  const selectedConv = mockConversations.find((c) => c.id === selectedConversation);

  return (
    <div className="flex h-full">
      {/* Conversation List */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search conversations..." className="pl-9" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="divide-y divide-border">
            {mockConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`
                  w-full p-4 text-left transition-colors
                  ${selectedConversation === conv.id ? "bg-accent" : "hover:bg-muted"}
                `}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {conv.customerName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">{conv.customerName}</span>
                      <span className="text-xs text-muted-foreground">{conv.timestamp}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                    <div className="mt-2">
                      <span className={`status-pill status-${conv.status.toLowerCase()}`}>
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
      {selectedConv ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="h-14 border-b border-border px-6 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{selectedConv.customerName}</h2>
              <p className="text-xs text-muted-foreground">+1 (555) 123-4567</p>
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
              {/* Customer message */}
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs">SC</span>
                </Avatar>
                <div className="flex-1">
                  <div className="bg-muted rounded-lg p-3 inline-block max-w-md">
                    <p className="text-sm">Do you have this in size 42?</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">10:32 AM</p>
                </div>
              </div>

              {/* System note */}
              <div className="flex justify-center">
                <div className="bg-secondary px-3 py-1 rounded text-xs text-muted-foreground">
                  Invoice #1041 sent via Template: Invoice v1
                </div>
              </div>

              {/* Agent message */}
              <div className="flex gap-3 justify-end">
                <div className="flex-1 flex flex-col items-end">
                  <div className="bg-foreground text-background rounded-lg p-3 inline-block max-w-md">
                    <p className="text-sm">Yes, we have size 42 in stock. I'll send you the details.</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">10:35 AM</p>
                </div>
              </div>
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
                className="flex-1"
              />
              <Button size="icon">
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
  );
}
