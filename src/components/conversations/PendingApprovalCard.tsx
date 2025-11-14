import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Brain, ShoppingCart, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PendingApprovalCardProps {
  approval: {
    id: string;
    action_type: string;
    action_payload: any;
    ai_reasoning: string | null;
    confidence_score: number | null;
    created_at: string;
    conversation_id: string;
  };
  onApprovalComplete?: () => void;
  onOptimisticMessage?: (message: {
    id: string;
    content: string;
    direction: 'outbound';
    created_at: string;
    status: 'sending';
  }) => void;
}

export function PendingApprovalCard({ approval, onApprovalComplete, onOptimisticMessage }: PendingApprovalCardProps) {
  const [isHidden, setIsHidden] = useState(false);
  const { toast } = useToast();

  const getActionIcon = () => {
    switch (approval.action_type) {
      case 'add_to_cart':
        return <ShoppingCart className="h-4 w-4" />;
      case 'send_message':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getActionLabel = () => {
    switch (approval.action_type) {
      case 'add_to_cart':
        return 'Add to Cart';
      case 'send_message':
        return 'Send Message';
      case 'create_checkout':
        return 'Create Checkout';
      default:
        return approval.action_type.replace('_', ' ');
    }
  };

  const getActionDetails = () => {
    const { action_payload } = approval;
    
    if (approval.action_type === 'send_message') {
      return action_payload.message || 'No message content';
    }
    
    if (approval.action_type === 'add_to_cart') {
      return `Product: ${action_payload.product_title || 'Unknown'} (Qty: ${action_payload.quantity || 1})`;
    }

    if (approval.action_type === 'create_checkout') {
      return `Total: $${action_payload.total || 0}`;
    }

    return JSON.stringify(action_payload, null, 2);
  };

  const handleApprove = async () => {
    // Generate optimistic message ID
    const optimisticId = `optimistic-${Date.now()}-${Math.random()}`;
    const messageContent = approval.action_type === 'send_message' 
      ? approval.action_payload.message 
      : JSON.stringify(approval.action_payload);

    // Immediately hide card and show optimistic message
    setIsHidden(true);
    
    // Create optimistic message
    if (onOptimisticMessage) {
      onOptimisticMessage({
        id: optimisticId,
        content: messageContent,
        direction: 'outbound',
        created_at: new Date().toISOString(),
        status: 'sending'
      });
    }

    // Fire approval in background (don't await)
    supabase.functions.invoke('approve-ai-action', {
      body: { 
        approvalId: approval.id, 
        approved: true,
        optimisticMessageId: optimisticId 
      }
    }).then(({ error }) => {
      if (error) {
        // Rollback on error
        console.error('Approval error:', error);
        setIsHidden(false);
        toast({
          title: "Action failed",
          description: error.message || "Failed to execute action",
          variant: "destructive"
        });
      } else {
        // Success notification
        toast({
          title: "Action approved",
          description: "Message sent successfully"
        });
      }
      
      onApprovalComplete?.();
    }).catch((error) => {
      // Rollback on error
      console.error('Approval error:', error);
      setIsHidden(false);
      toast({
        title: "Action failed", 
        description: error.message || "Failed to execute action",
        variant: "destructive"
      });
      onApprovalComplete?.();
    });
  };

  const handleReject = async () => {
    setIsHidden(true);
    
    try {
      const { error } = await supabase.functions.invoke('approve-ai-action', {
        body: { 
          approvalId: approval.id, 
          approved: false,
          rejectionReason: 'Rejected by user'
        }
      });

      if (error) throw error;

      toast({
        title: "Action rejected",
        description: "The AI action has been rejected"
      });

      onApprovalComplete?.();
    } catch (error: any) {
      console.error('Rejection error:', error);
      setIsHidden(false);
      toast({
        title: "Rejection failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const confidenceColor = (score: number | null) => {
    if (!score) return 'secondary';
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'destructive';
  };

  if (isHidden) return null;

  return (
    <Card className="bg-accent/10 border-accent/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getActionIcon()}
            <div>
              <p className="font-medium text-sm">{getActionLabel()}</p>
              <p className="text-xs text-muted-foreground">AI suggested action</p>
            </div>
          </div>
          <Badge variant={confidenceColor(approval.confidence_score)}>
            {approval.confidence_score 
              ? `${Math.round(approval.confidence_score * 100)}% confident`
              : 'Unknown'
            }
          </Badge>
        </div>

        {approval.ai_reasoning && (
          <div className="bg-background/50 rounded p-2">
            <p className="text-xs text-muted-foreground">
              <Brain className="h-3 w-3 inline mr-1" />
              {approval.ai_reasoning}
            </p>
          </div>
        )}

        <div className="bg-muted/50 rounded p-2">
          <p className="text-xs font-semibold mb-1">Action Details:</p>
          <p className="text-xs font-mono break-all">{getActionDetails()}</p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleApprove}
            className="flex-1"
            size="sm"
          >
            <Check className="h-3 w-3" />
            Approve
          </Button>
          <Button
            onClick={handleReject}
            variant="outline"
            size="sm"
          >
            <X className="h-3 w-3" />
            Reject
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Requested {new Date(approval.created_at).toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  );
}
