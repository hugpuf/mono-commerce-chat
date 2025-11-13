import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useAutomations, type AutomationMode } from '@/contexts/AutomationsContext';
import { cn } from '@/lib/utils';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkflowSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkflowSettingsDialog({ open, onOpenChange }: WorkflowSettingsDialogProps) {
  const { settings, updateSettings } = useAutomations();
  const { toast } = useToast();

  const modes: { value: AutomationMode; label: string; description: string }[] = [
    { value: 'manual', label: 'Manual', description: 'Review every action' },
    { value: 'hitl', label: 'Human-in-the-Loop', description: 'Approve high-impact actions' },
    { value: 'auto', label: 'Fully Auto', description: 'Run without approval' },
  ];

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Workflow settings have been updated successfully",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Workflow Settings</DialogTitle>
          <DialogDescription>
            Configure AI behavior and automation rules for conversations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Mode Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Workflow Mode</Label>
            <div className="grid grid-cols-3 gap-3">
              {modes.map(mode => (
                <button
                  key={mode.value}
                  onClick={() => updateSettings({ mode: mode.value })}
                  className={cn(
                    'px-4 py-3 border rounded-lg text-left transition-colors',
                    settings.mode === mode.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  )}
                >
                  <div className="font-medium text-sm">{mode.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{mode.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Confidence Threshold - HITL Mode Only */}
          {settings.mode === 'hitl' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Confidence Threshold</Label>
                <span className="text-sm font-mono text-muted-foreground">
                  {settings.confidenceThreshold}%
                </span>
              </div>
              <Slider
                value={[settings.confidenceThreshold]}
                onValueChange={([value]) => updateSettings({ confidenceThreshold: value })}
                min={0}
                max={100}
                step={5}
                className="py-2"
              />
              <p className="text-xs text-muted-foreground">
                AI actions below this threshold require your approval
              </p>
            </div>
          )}

          {/* AI Voice & Guardrails */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">AI Voice & Guardrails</Label>
            
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Brand Tone</Label>
                <Textarea
                  value={settings.aiVoice}
                  onChange={e => updateSettings({ aiVoice: e.target.value })}
                  placeholder="Describe your brand voice..."
                  className="mt-2 min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Do's</Label>
                  <Textarea
                    value={settings.guardrails.doList.join('\n')}
                    onChange={e =>
                      updateSettings({
                        guardrails: {
                          ...settings.guardrails,
                          doList: e.target.value.split('\n').filter(Boolean),
                        },
                      })
                    }
                    placeholder="One per line..."
                    className="mt-2 min-h-[120px] font-mono text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Don'ts</Label>
                  <Textarea
                    value={settings.guardrails.dontList.join('\n')}
                    onChange={e =>
                      updateSettings({
                        guardrails: {
                          ...settings.guardrails,
                          dontList: e.target.value.split('\n').filter(Boolean),
                        },
                      })
                    }
                    placeholder="One per line..."
                    className="mt-2 min-h-[120px] font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Escalation Rules</Label>
                  <Textarea
                    value={settings.guardrails.escalationRules}
                    onChange={e =>
                      updateSettings({
                        guardrails: { ...settings.guardrails, escalationRules: e.target.value },
                      })
                    }
                    placeholder="When to escalate..."
                    className="mt-2 min-h-[100px] text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Quiet Hours</Label>
                  <Textarea
                    value={settings.guardrails.quietHours}
                    onChange={e =>
                      updateSettings({
                        guardrails: { ...settings.guardrails, quietHours: e.target.value },
                      })
                    }
                    placeholder="e.g., 10pm-8am..."
                    className="mt-2 min-h-[100px] text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Compliance Notes</Label>
                  <Textarea
                    value={settings.guardrails.compliance}
                    onChange={e =>
                      updateSettings({
                        guardrails: { ...settings.guardrails, compliance: e.target.value },
                      })
                    }
                    placeholder="Regulatory requirements..."
                    className="mt-2 min-h-[100px] text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}