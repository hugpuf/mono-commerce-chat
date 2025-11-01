import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { type AutomationFlow, type AutomationMode } from '@/contexts/AutomationsContext';
import { cn } from '@/lib/utils';

interface FlowBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automation?: AutomationFlow | null;
  onSave: (automation: Partial<AutomationFlow>) => void;
}

export default function FlowBuilder({ open, onOpenChange, automation, onSave }: FlowBuilderProps) {
  const [name, setName] = useState(automation?.name || '');
  const [description, setDescription] = useState(automation?.description || '');
  const [naturalLanguage, setNaturalLanguage] = useState('');
  const [mode, setMode] = useState<AutomationMode>(automation?.mode || 'hitl');
  const [expandedSections, setExpandedSections] = useState({
    triggers: true,
    conditions: true,
    actions: true,
  });

  const [triggers, setTriggers] = useState(
    automation?.triggers || [{ type: 'intent' as const, config: {} }]
  );
  const [conditions, setConditions] = useState(automation?.conditions || ['']);
  const [actions, setActions] = useState(
    automation?.actions || [{ type: 'send_message' as const, config: {} }]
  );

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSave = () => {
    onSave({
      id: automation?.id || `custom-${Date.now()}`,
      name,
      description,
      triggers,
      conditions: conditions.filter(Boolean),
      actions,
      mode,
      enabled: automation?.enabled ?? false,
      category: 'custom',
      metrics: automation?.metrics || {
        triggers: 0,
        messagesSent: 0,
        replyRate: 0,
        conversionRate: 0,
        revenueInfluenced: 0,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{automation ? 'Edit Workflow' : 'Create Workflow'}</DialogTitle>
          <DialogDescription>
            Build your workflow using natural language or structured blocks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="My Custom Workflow"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What does this workflow do?"
                className="mt-1 min-h-[60px]"
              />
            </div>
            <div>
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as AutomationMode)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="hitl">Human-in-the-Loop</SelectItem>
                  <SelectItem value="auto">Fully Auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Natural Language Input */}
          <div className="border border-border rounded-md p-4 bg-muted/30">
            <Label className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Describe your workflow in plain English
            </Label>
            <Textarea
              value={naturalLanguage}
              onChange={e => setNaturalLanguage(e.target.value)}
              placeholder='e.g., "If customer mentions a competitor, match price and offer 5% off"'
              className="min-h-[80px] bg-background"
            />
            <Button variant="outline" size="sm" className="mt-2 gap-2">
              <Sparkles className="h-3 w-3" />
              Generate Flow
            </Button>
          </div>

          {/* Structured Flow */}
          <div className="space-y-4">
            {/* Triggers */}
            <div className="border border-border rounded-md">
              <button
                onClick={() => toggleSection('triggers')}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <span className="font-medium text-sm">Triggers</span>
                {expandedSections.triggers ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {expandedSections.triggers && (
                <div className="p-4 pt-0 space-y-3">
                  {triggers.map((trigger, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Select
                        value={trigger.type}
                        onValueChange={type =>
                          setTriggers(prev =>
                            prev.map((t, i) => (i === idx ? { ...t, type: type as any } : t))
                          )
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="intent">Intent Detection</SelectItem>
                          <SelectItem value="sentiment">Sentiment</SelectItem>
                          <SelectItem value="entity">Entity/Competitor</SelectItem>
                          <SelectItem value="silence">Silence</SelectItem>
                          <SelectItem value="payment">Payment Event</SelectItem>
                          <SelectItem value="order">Order Event</SelectItem>
                          <SelectItem value="stock">Stock Level</SelectItem>
                          <SelectItem value="optin">New Opt-in</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTriggers(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTriggers(prev => [...prev, { type: 'intent', config: {} }])}
                    className="gap-2"
                  >
                    <Plus className="h-3 w-3" />
                    Add Trigger
                  </Button>
                </div>
              )}
            </div>

            {/* Conditions */}
            <div className="border border-border rounded-md">
              <button
                onClick={() => toggleSection('conditions')}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <span className="font-medium text-sm">Conditions</span>
                {expandedSections.conditions ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {expandedSections.conditions && (
                <div className="p-4 pt-0 space-y-3">
                  {conditions.map((condition, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={condition}
                        onChange={e =>
                          setConditions(prev => prev.map((c, i) => (i === idx ? e.target.value : c)))
                        }
                        placeholder="e.g., Customer sentiment < -0.7"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConditions(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConditions(prev => [...prev, ''])}
                    className="gap-2"
                  >
                    <Plus className="h-3 w-3" />
                    Add Condition
                  </Button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border border-border rounded-md">
              <button
                onClick={() => toggleSection('actions')}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <span className="font-medium text-sm">Actions</span>
                {expandedSections.actions ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {expandedSections.actions && (
                <div className="p-4 pt-0 space-y-3">
                  {actions.map((action, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Select
                        value={action.type}
                        onValueChange={type =>
                          setActions(prev =>
                            prev.map((a, i) => (i === idx ? { ...a, type: type as any } : a))
                          )
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="send_message">Send Message</SelectItem>
                          <SelectItem value="send_template">Send Template</SelectItem>
                          <SelectItem value="generate_checkout">Generate Checkout</SelectItem>
                          <SelectItem value="tag">Tag Conversation</SelectItem>
                          <SelectItem value="assign">Assign</SelectItem>
                          <SelectItem value="escalate">Escalate</SelectItem>
                          <SelectItem value="schedule">Schedule Follow-up</SelectItem>
                          <SelectItem value="update_order">Update Order</SelectItem>
                          <SelectItem value="add_note">Add Note</SelectItem>
                          <SelectItem value="pause_flow">Pause Flow</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActions(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActions(prev => [...prev, { type: 'send_message', config: {} }])}
                    className="gap-2"
                  >
                    <Plus className="h-3 w-3" />
                    Add Action
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Workflow</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
