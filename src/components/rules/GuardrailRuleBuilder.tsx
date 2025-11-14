import { useState, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { RuleConditionBuilder } from './RuleConditionBuilder';

interface GuardrailRule {
  id?: string;
  name: string;
  description: string;
  type: 'keyword' | 'length' | 'pattern' | 'sentiment' | 'topic';
  condition: any;
  enforcement: 'warn' | 'block';
  fallback_message: string;
  priority: number;
  enabled: boolean;
}

export function GuardrailRuleBuilder() {
  const { workspace } = useWorkspace();
  const [rules, setRules] = useState<GuardrailRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workspace?.id) {
      loadRules();
    }
  }, [workspace?.id]);

  const loadRules = async () => {
    if (!workspace?.id) return;

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('guardrail_rules')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('priority', { ascending: true });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error loading guardrail rules:', error);
      toast.error('Failed to load guardrail rules');
    } finally {
      setLoading(false);
    }
  };

  const addRule = () => {
    const newRule: GuardrailRule = {
      name: 'New Guardrail Rule',
      description: '',
      type: 'keyword',
      condition: { keywords: [] },
      enforcement: 'warn',
      fallback_message: 'I cannot assist with that request.',
      priority: rules.length,
      enabled: true,
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (index: number, updates: Partial<GuardrailRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setRules(newRules);
  };

  const deleteRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const saveRules = async () => {
    if (!workspace?.id) return;

    setSaving(true);
    try {
      // Delete existing rules
      await (supabase as any)
        .from('guardrail_rules')
        .delete()
        .eq('workspace_id', workspace.id);

      // Insert new rules
      const rulesToInsert = rules.map((rule, index) => ({
        workspace_id: workspace.id,
        name: rule.name,
        description: rule.description,
        type: rule.type,
        condition: rule.condition,
        enforcement: rule.enforcement,
        fallback_message: rule.fallback_message,
        priority: index,
        enabled: rule.enabled,
      }));

      const { error } = await (supabase as any)
        .from('guardrail_rules')
        .insert(rulesToInsert);

      if (error) throw error;

      toast.success('Guardrail rules saved successfully');
      loadRules();
    } catch (error) {
      console.error('Error saving guardrail rules:', error);
      toast.error('Failed to save guardrail rules');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading rules...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Create rules to prevent AI from generating inappropriate responses
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={addRule} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
          <Button onClick={saveRules} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No guardrail rules configured. Click "Add Rule" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rules.map((rule, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-1 cursor-move" />
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <Input
                          value={rule.name}
                          onChange={(e) => updateRule(index, { name: e.target.value })}
                          className="text-lg font-semibold"
                          placeholder="Rule name"
                        />
                        <Badge variant={rule.enforcement === 'block' ? 'destructive' : 'secondary'}>
                          {rule.enforcement}
                        </Badge>
                      </div>
                      <Textarea
                        value={rule.description}
                        onChange={(e) => updateRule(index, { description: e.target.value })}
                        placeholder="Describe what this rule does..."
                        className="min-h-[60px]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) => updateRule(index, { enabled: checked })}
                    />
                    <Button
                      onClick={() => deleteRule(index)}
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rule Type</Label>
                    <Select
                      value={rule.type}
                      onValueChange={(value: any) => updateRule(index, { type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keyword">Keyword Blocking</SelectItem>
                        <SelectItem value="length">Response Length</SelectItem>
                        <SelectItem value="pattern">Pattern Matching</SelectItem>
                        <SelectItem value="sentiment">Sentiment Control</SelectItem>
                        <SelectItem value="topic">Topic Restriction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Enforcement</Label>
                    <Select
                      value={rule.enforcement}
                      onValueChange={(value: any) => updateRule(index, { enforcement: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warn">Warn (Log Only)</SelectItem>
                        <SelectItem value="block">Block (Prevent Response)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <RuleConditionBuilder
                  type={rule.type}
                  condition={rule.condition}
                  onChange={(condition) => updateRule(index, { condition })}
                />

                <div className="space-y-2">
                  <Label>Fallback Message (shown when blocked)</Label>
                  <Textarea
                    value={rule.fallback_message}
                    onChange={(e) => updateRule(index, { fallback_message: e.target.value })}
                    placeholder="Message to show when this rule is triggered..."
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
