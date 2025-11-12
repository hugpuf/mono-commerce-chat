import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface NewConversationDialogDemoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateConversation: (data: { phone: string; name: string; initialMessage: string }) => void;
}

export function NewConversationDialogDemo({ open, onOpenChange, onCreateConversation }: NewConversationDialogDemoProps) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [errors, setErrors] = useState<{ phone?: string; message?: string }>({});

  const validatePhone = (phoneNumber: string) => {
    // Basic phone validation
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 10) {
      return "Phone number must be at least 10 digits";
    }
    if (cleaned.length > 15) {
      return "Phone number must be at most 15 digits";
    }
    return null;
  };

  const handleSubmit = () => {
    const newErrors: { phone?: string; message?: string } = {};
    
    // Validate phone
    const phoneError = validatePhone(phone);
    if (phoneError) {
      newErrors.phone = phoneError;
    }

    // Validate message
    if (!initialMessage.trim()) {
      newErrors.message = "Initial message is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Create conversation
    onCreateConversation({
      phone: phone.replace(/\D/g, ''),
      name: name.trim() || `+${phone.replace(/\D/g, '')}`,
      initialMessage: initialMessage.trim(),
    });

    // Reset form
    setPhone("");
    setName("");
    setInitialMessage("");
    setErrors({});
    onOpenChange(false);

    toast({
      title: "Conversation started",
      description: "New conversation created successfully",
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setPhone("");
      setName("");
      setInitialMessage("");
      setErrors({});
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
          <DialogDescription>
            Enter customer details to start a new conversation
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              placeholder="+1 234 567 8900"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              className={errors.phone ? "border-destructive" : ""}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">Customer Name (Optional)</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="message">Initial Message *</Label>
            <Textarea
              id="message"
              placeholder="Type your message..."
              value={initialMessage}
              onChange={(e) => {
                setInitialMessage(e.target.value);
                setErrors((prev) => ({ ...prev, message: undefined }));
              }}
              className={errors.message ? "border-destructive" : ""}
              rows={4}
            />
            {errors.message && (
              <p className="text-sm text-destructive">{errors.message}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Start Conversation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
