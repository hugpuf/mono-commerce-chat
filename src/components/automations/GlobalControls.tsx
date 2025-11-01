import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Play, ChevronDown, ChevronUp } from 'lucide-react';
import { useAutomations, type AutomationMode } from '@/contexts/AutomationsContext';
import { cn } from '@/lib/utils';

export default function GlobalControls({ onPreview }: { onPreview: () => void }) {
  const { settings, updateSettings } = useAutomations();
  const [expanded, setExpanded] = useState(false);

  const modes: { value: AutomationMode; label: string; description: string }[] = [
    { value: 'manual', label: 'Manual', description: 'Review every action' },
    { value: 'hitl', label: 'Human-in-the-Loop', description: 'Approve high-impact actions' },
    { value: 'auto', label: 'Fully Auto', description: 'Run without approval' },
  ];

  return (
    <div className="border-b border-border bg-background">
      <div className="px-8 py-6 space-y-6">
        {/* Mode Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Workflow Mode</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="gap-2"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {expanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {modes.map(mode => (
              <button
                key={mode.value}
                onClick={() => updateSettings({ mode: mode.value })}
                className={cn(
                  'px-4 py-3 border rounded-md text-left transition-colors',
                  settings.mode === mode.value
                    ? 'border-foreground bg-foreground/5'
                    : 'border-border hover:border-foreground/50'
                )}
              >
                <div className="font-medium text-sm">{mode.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{mode.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Confidence Threshold - Only shown in HITL and Auto modes */}
        {settings.mode !== 'manual' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Confidence Threshold</Label>
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
            <p className="text-xs text-muted-foreground mt-1">
              {settings.mode === 'hitl' 
                ? 'Actions below this threshold require your approval'
                : 'Only execute actions when AI confidence exceeds this threshold'}
            </p>
          </div>
        )}

        {/* Expanded Section */}
        {expanded && (
          <div className="space-y-6 pt-4 border-t border-border">
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
                    className="mt-1 min-h-[60px] text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                      className="mt-1 min-h-[80px] text-sm font-mono"
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
                      className="mt-1 min-h-[80px] text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Escalation Rules</Label>
                    <Textarea
                      value={settings.guardrails.escalationRules}
                      onChange={e =>
                        updateSettings({
                          guardrails: { ...settings.guardrails, escalationRules: e.target.value },
                        })
                      }
                      className="mt-1 min-h-[60px] text-sm"
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
                      className="mt-1 min-h-[60px] text-sm"
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
                      className="mt-1 min-h-[60px] text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Button */}
            <div className="flex justify-end pt-2">
              <Button onClick={onPreview} variant="outline" className="gap-2">
                <Play className="h-4 w-4" />
                Preview / Simulate
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
