import { Avatar } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { MessageContextMenu } from "./MessageContextMenu";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  created_at: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

interface MessageGroupProps {
  messages: Message[];
  customerName: string;
  isOutbound: boolean;
  onDeleteMessage?: (messageId: string) => void;
  canDeleteMessages?: boolean;
  currentUserId?: string;
}

function MessageStatusIcon({ status }: { status?: string }) {
  switch (status) {
    case 'sending':
      return <Clock className="h-3 w-3 text-muted-foreground" />;
    case 'sent':
      return <Check className="h-3 w-3 text-muted-foreground" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    case 'read':
      return <CheckCheck className="h-3 w-3 text-primary" />;
    case 'failed':
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    default:
      return null;
  }
}

export function MessageGroup({ 
  messages, 
  customerName, 
  isOutbound, 
  onDeleteMessage,
  canDeleteMessages = false,
  currentUserId 
}: MessageGroupProps) {
  const { toast } = useToast();
  
  if (messages.length === 0) return null;

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  const handleDeleteMessage = (messageId: string) => {
    if (onDeleteMessage) {
      onDeleteMessage(messageId);
    }
  };

  return (
    <div className={`flex gap-3 ${isOutbound ? 'justify-end' : ''}`}>
      {!isOutbound && (
        <Avatar className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-medium">
            {customerName
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) || "?"}
          </span>
        </Avatar>
      )}
      <div className={`flex flex-col gap-1 ${isOutbound ? 'items-end' : 'items-start'} max-w-md`}>
        {messages.map((msg, index) => {
          // Can delete if user is admin OR if it's their own outbound message
          const canDelete = canDeleteMessages && (isOutbound || !!currentUserId);
          
          return (
            <MessageContextMenu
              key={msg.id}
              onDelete={() => handleDeleteMessage(msg.id)}
              onCopy={() => handleCopyMessage(msg.content)}
              canDelete={canDelete}
            >
              <div
                className={`rounded-lg p-3 cursor-pointer transition-opacity hover:opacity-90 ${
                  isOutbound
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
              </div>
            </MessageContextMenu>
          );
        })}
        <div className="flex items-center gap-1.5 px-1">
          {isOutbound && <MessageStatusIcon status={messages[messages.length - 1]?.status} />}
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(messages[messages.length - 1].created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
}