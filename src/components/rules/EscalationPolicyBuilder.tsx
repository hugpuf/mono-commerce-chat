import { useState, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';

interface EscalationPolicy {
  id?: string;
  name: string;
  description: string;
  triggers: {
    sentiment_threshold?: number;
    confidence_threshold?: number;
    cart_value_min?: number;
    message_count_min?: number;
    time_since_reply_min?: number;
  };
  routing: {
    notification_type: 'human_review' | 'supervisor' | 'email';
    notify_emails?: string[];
  };
  behavior: {
    pause_automation: boolean;
    send_notification: boolean;
  };
  priority: number;
  enabled: boolean;
}

export function EscalationPolicyBuilder() {
  const { workspace } = useWorkspace();
  const [policies, setPolicies] = useState<EscalationPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workspace?.id) {
      loadPolicies();
    }
  }, [workspace?.id]);

  const loadPolicies = async () => {
    if (!workspace?.id) return;

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('escalation_policies')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('priority', { ascending: true });

      if (error) throw error;
      setPolicies(data || []);
    } catch (error) {
      console.error('Error loading escalation policies:', error);
      toast.error('Failed to load escalation policies');
    } finally {
      setLoading(false);
    }
  };

  const addPolicy = () => {
    const newPolicy: EscalationPolicy = {
      name: 'New Escalation Policy',
      description: '',
      triggers: {},
      routing: {
        notification_type: 'human_review',
      },
      behavior: {
        pause_automation: true,
        send_notification: true,
      },
      priority: policies.length,
      enabled: true,
    };
    setPolicies([...policies, newPolicy]);
  };

  const updatePolicy = (index: number, updates: Partial<EscalationPolicy>) => {
    const newPolicies = [...policies];
    newPolicies[index] = { ...newPolicies[index], ...updates };
    setPolicies(newPolicies);
  };

  const deletePolicy = (index: number) => {
    setPolicies(policies.filter((_, i) => i !== index));
  };

  const savePolicies = async () => {
    if (!workspace?.id) return;

    setSaving(true);
    try {
      await (supabase as any)
        .from('escalation_policies')
        .delete()
        .eq('workspace_id', workspace.id);

      const policiesToInsert = policies.map((policy, index) => ({
        workspace_id: workspace.id,
        name: policy.name,
        description: policy.description,
        triggers: policy.triggers,
        routing: policy.routing,
        behavior: policy.behavior,
        priority: index,
        enabled: policy.enabled,
      }));

      const { error } = await (supabase as any)
        .from('escalation_policies')
        .insert(policiesToInsert);

      if (error) throw error;

      toast.success('Escalation policies saved successfully');
      loadPolicies();
    } catch (error) {
      console.error('Error saving escalation policies:', error);
      toast.error('Failed to save escalation policies');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading policies...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Define when conversations should be escalated to human review
        </p>
        <div className="flex gap-2">
          <Button onClick={addPolicy} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Policy
          </Button>
          <Button onClick={savePolicies} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </div>

      {policies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No escalation policies configured. Click "Add Policy" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {policies.map((policy, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-1 cursor-move" />
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <Input
                          value={policy.name}
                          onChange={(e) => updatePolicy(index, { name: e.target.value })}
                          className="text-lg font-semibold"
                          placeholder="Policy name"
                        />
                        <Badge variant="outline">Priority {index + 1}</Badge>
                      </div>
                      <Textarea
                        value={policy.description}
                        onChange={(e) => updatePolicy(index, { description: e.target.value })}
                        placeholder="Describe when this escalation should trigger..."
                        className="min-h-[60px]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={policy.enabled}
                      onCheckedChange={(checked) => updatePolicy(index, { enabled: checked })}
                    />
                    <Button
                      onClick={() => deletePolicy(index)}
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium mb-4 block">Escalation Triggers</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Negative Sentiment Below</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="-1"
                        max="0"
                        value={policy.triggers.sentiment_threshold || ''}
                        onChange={(e) =>
                          updatePolicy(index, {
                            triggers: {
                              ...policy.triggers,
                              sentiment_threshold: parseFloat(e.target.value),
                            },
                          })
                        }
                        placeholder="-0.7"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">AI Confidence Below (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={policy.triggers.confidence_threshold || ''}
                        onChange={(e) =>
                          updatePolicy(index, {
                            triggers: {
                              ...policy.triggers,
                              confidence_threshold: parseInt(e.target.value),
                            },
                          })
                        }
                        placeholder="70"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Cart Value Above ($)</Label>
                      <Input
                        type="number"
                        value={policy.triggers.cart_value_min || ''}
                        onChange={(e) =>
                          updatePolicy(index, {
                            triggers: {
                              ...policy.triggers,
                              cart_value_min: parseInt(e.target.value),
                            },
                          })
                        }
                        placeholder="500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Message Count Above</Label>
                      <Input
                        type="number"
                        value={policy.triggers.message_count_min || ''}
                        onChange={(e) =>
                          updatePolicy(index, {
                            triggers: {
                              ...policy.triggers,
                              message_count_min: parseInt(e.target.value),
                            },
                          })
                        }
                        placeholder="10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium mb-4 block">Routing & Behavior</Label>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Notification Type</Label>
                      <Select
                        value={policy.routing.notification_type}
                        onValueChange={(value: any) =>
                          updatePolicy(index, {
                            routing: { ...policy.routing, notification_type: value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="human_review">Human Review Queue</SelectItem>
                          <SelectItem value="supervisor">Supervisor Alert</SelectItem>
                          <SelectItem value="email">Email Notification</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Pause AI Automation</Label>
                      <Switch
                        checked={policy.behavior.pause_automation}
                        onCheckedChange={(checked) =>
                          updatePolicy(index, {
                            behavior: { ...policy.behavior, pause_automation: checked },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Send Notification</Label>
                      <Switch
                        checked={policy.behavior.send_notification}
                        onCheckedChange={(checked) =>
                          updatePolicy(index, {
                            behavior: { ...policy.behavior, send_notification: checked },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
