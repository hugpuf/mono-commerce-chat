import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Brain, ShoppingCart, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

interface PendingApprovalCardProps {
  approval: {
    id: string;
    action_type: string;
    action_payload: any;
    ai_reasoning: string | null;
    confidence_score: number | null;
    created_at: string;
  };
  onApprovalComplete?: () => void;
}

export function PendingApprovalCard({ approval, onApprovalComplete }: PendingApprovalCardProps) {
  const [loading, setLoading] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
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
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('approve-ai-action', {
        body: { approvalId: approval.id, approved: true }
      });

      if (error) throw error;

      toast({
        title: "Action approved",
        description: "The AI action has been executed successfully",
      });

      onApprovalComplete?.();
    } catch (error) {
      console.error('Approval error:', error);
      toast({
        title: "Approval failed",
        description: error.message || "Failed to approve action",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for rejection",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('approve-ai-action', {
        body: { 
          approvalId: approval.id, 
          approved: false,
          rejectionReason: rejectionReason.trim()
        }
      });

      if (error) throw error;

      toast({
        title: "Action rejected",
        description: "The AI action has been declined",
      });

      onApprovalComplete?.();
    } catch (error) {
      console.error('Rejection error:', error);
      toast({
        title: "Rejection failed",
        description: error.message || "Failed to reject action",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const confidenceColor = (score: number | null) => {
    if (!score) return 'secondary';
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'destructive';
  };

  return (
    <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {getActionIcon()}
            <div>
              <CardTitle className="text-sm font-medium">{getActionLabel()}</CardTitle>
              <CardDescription className="text-xs">Requires your approval</CardDescription>
            </div>
          </div>
          {approval.confidence_score && (
            <Badge variant={confidenceColor(approval.confidence_score)} className="text-xs">
              {Math.round(approval.confidence_score * 100)}% confidence
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {approval.ai_reasoning && (
          <div className="p-2 rounded bg-background/50 border border-border">
            <p className="text-xs text-muted-foreground mb-1 font-medium">AI Reasoning:</p>
            <p className="text-xs">{approval.ai_reasoning}</p>
          </div>
        )}

        <div className="p-2 rounded bg-background/50 border border-border">
          <p className="text-xs text-muted-foreground mb-1 font-medium">Action Details:</p>
          <p className="text-xs font-mono break-all">{getActionDetails()}</p>
        </div>

        {showRejectReason ? (
          <div className="space-y-2">
            <Textarea
              placeholder="Why are you rejecting this action?"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="text-sm min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleReject}
                disabled={loading}
                variant="destructive"
                size="sm"
                className="flex-1"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                Confirm Reject
              </Button>
              <Button
                onClick={() => {
                  setShowRejectReason(false);
                  setRejectionReason('');
                }}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1"
              size="sm"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Approve
            </Button>
            <Button
              onClick={() => setShowRejectReason(true)}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <X className="h-3 w-3" />
              Reject
            </Button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          Requested {new Date(approval.created_at).toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  );
}
