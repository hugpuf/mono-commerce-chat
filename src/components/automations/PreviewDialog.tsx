import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Sparkles } from 'lucide-react';
import { useAutomations } from '@/contexts/AutomationsContext';

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PreviewMessage {
  role: 'user' | 'system';
  content: string;
  metadata?: {
    automation?: string;
    action?: string;
    confidence?: number;
  };
}

export default function PreviewDialog({ open, onOpenChange }: PreviewDialogProps) {
  const { settings, automations } = useAutomations();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<PreviewMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: PreviewMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    // Simulate AI processing
    setTimeout(() => {
      const enabledAutomations = automations.filter(a => a.enabled);
      const matched = enabledAutomations[Math.floor(Math.random() * enabledAutomations.length)];

      if (matched) {
        const systemMessage: PreviewMessage = {
          role: 'system',
          content: `Would trigger automation: "${matched.name}"\n\nProposed action: ${matched.actions[0]?.type || 'No action'}\n\n${settings.shadowMode ? '[Shadow mode: No action taken]' : '[Action would be executed]'}`,
          metadata: {
            automation: matched.name,
            action: matched.actions[0]?.type,
            confidence: Math.floor(Math.random() * 20) + 80,
          },
        };
        setMessages(prev => [...prev, systemMessage]);
      } else {
        const systemMessage: PreviewMessage = {
          role: 'system',
          content: 'No automation triggered for this message.',
        };
        setMessages(prev => [...prev, systemMessage]);
      }

      setIsProcessing(false);
    }, 1000);
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview / Simulate</DialogTitle>
          <DialogDescription>
            Test your automations with example messages. No actions will be taken.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 min-h-[300px]">
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Enter a message to see which automations would trigger</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={
                    msg.role === 'user'
                      ? 'flex justify-end'
                      : 'flex justify-start'
                  }
                >
                  <div
                    className={
                      msg.role === 'user'
                        ? 'bg-foreground text-background px-4 py-2 rounded-md max-w-[80%]'
                        : 'bg-muted px-4 py-3 rounded-md max-w-[80%] space-y-2'
                    }
                  >
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    {msg.metadata && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <Badge variant="outline" className="text-xs">
                          {msg.metadata.automation}
                        </Badge>
                        {msg.metadata.confidence && (
                          <span className="text-xs text-muted-foreground">
                            {msg.metadata.confidence}% confidence
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-muted px-4 py-2 rounded-md">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    Processing...
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a test message..."
              className="flex-1 min-h-[60px]"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleReset} disabled={messages.length === 0}>
              Reset
            </Button>
            <Button onClick={handleSend} disabled={!input.trim() || isProcessing} className="gap-2">
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
