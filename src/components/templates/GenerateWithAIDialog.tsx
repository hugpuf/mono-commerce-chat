import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";

interface GenerateWithAIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const stylePresets = [
  { id: "minimal", label: "Minimal Monochrome", description: "Clean B&W with hairline dividers" },
  { id: "classic", label: "Classic Professional", description: "Traditional invoice layout" },
  { id: "modern", label: "Modern Grid", description: "Contemporary card-based design" },
];

export function GenerateWithAIDialog({
  open,
  onOpenChange,
}: GenerateWithAIDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState("minimal");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      setGenerating(false);
      onOpenChange(false);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate with AI</DialogTitle>
          <DialogDescription>
            Describe your ideal invoice or choose a style preset
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Style Presets */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-3 block">
              STYLE PRESETS
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {stylePresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id)}
                  className={`
                    p-3 rounded border text-left transition-all
                    ${
                      selectedPreset === preset.id
                        ? "border-foreground bg-accent"
                        : "border-border hover:border-foreground/20"
                    }
                  `}
                >
                  <p className="text-sm font-medium mb-1">{preset.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
              CUSTOM PROMPT (OPTIONAL)
            </Label>
            <Textarea
              placeholder="E.g., Include a large QR code for payment, use a bold header with company logo, add a notes section at the bottom..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>Generating...</>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
