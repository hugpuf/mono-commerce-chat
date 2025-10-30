import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Send, Check, Clock } from "lucide-react";

interface TestSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string | null;
}

export function TestSendDialog({
  open,
  onOpenChange,
  templateId,
}: TestSendDialogProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setTimeout(() => {
        setSent(false);
        onOpenChange(false);
      }, 2000);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Test Send Invoice</DialogTitle>
          <DialogDescription>
            Send a test invoice via WhatsApp to verify formatting
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
              TEST CONTACT
            </Label>
            <Input placeholder="+1 (555) 123-4567" type="tel" />
          </div>

          {/* Language */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
              LANGUAGE
            </Label>
            <Select defaultValue="en">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
              MESSAGE (APPROVED TEMPLATE)
            </Label>
            <Textarea
              defaultValue="Hi {{customer_name}}, here's your invoice {{invoice_number}}. Total: {{grand_total}}. Pay here: {{pay_link}}"
              rows={3}
              className="resize-none font-mono text-xs"
              readOnly
            />
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Template approved
            </p>
          </div>

          {/* Warning for 24h window */}
          <div className="bg-muted p-3 rounded border border-border">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-xs">
                <p className="font-medium">24-Hour Window Status</p>
                <p className="text-muted-foreground mt-1">
                  This contact last messaged 2h ago. You can send without an approved
                  template.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending || sent}>
              {sending ? (
                <>Sending...</>
              ) : sent ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Sent
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
