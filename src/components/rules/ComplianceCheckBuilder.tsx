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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';

interface ComplianceCheck {
  id?: string;
  name: string;
  description: string;
  check_type: 'disclosure' | 'consent' | 'data_handling' | 'refund_policy' | 'custom';
  validation: {
    required_keywords?: string[];
    required_phrases?: string[];
    pattern?: string;
  };
  trigger_conditions: {
    keywords?: string[];
    topics?: string[];
  };
  enforcement: 'required' | 'recommended';
  compliance_text: string;
  priority: number;
  enabled: boolean;
}

export function ComplianceCheckBuilder() {
  const { workspace } = useWorkspace();
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workspace?.id) {
      loadChecks();
    }
  }, [workspace?.id]);

  const loadChecks = async () => {
    if (!workspace?.id) return;

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('compliance_checks')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('priority', { ascending: true });

      if (error) throw error;
      setChecks(data || []);
    } catch (error) {
      console.error('Error loading compliance checks:', error);
      toast.error('Failed to load compliance checks');
    } finally {
      setLoading(false);
    }
  };

  const addCheck = () => {
    const newCheck: ComplianceCheck = {
      name: 'New Compliance Check',
      description: '',
      check_type: 'disclosure',
      validation: {},
      trigger_conditions: {},
      enforcement: 'required',
      compliance_text: '',
      priority: checks.length,
      enabled: true,
    };
    setChecks([...checks, newCheck]);
  };

  const updateCheck = (index: number, updates: Partial<ComplianceCheck>) => {
    const newChecks = [...checks];
    newChecks[index] = { ...newChecks[index], ...updates };
    setChecks(newChecks);
  };

  const deleteCheck = (index: number) => {
    setChecks(checks.filter((_, i) => i !== index));
  };

  const saveChecks = async () => {
    if (!workspace?.id) return;

    setSaving(true);
    try {
      await (supabase as any)
        .from('compliance_checks')
        .delete()
        .eq('workspace_id', workspace.id);

      const checksToInsert = checks.map((check, index) => ({
        workspace_id: workspace.id,
        name: check.name,
        description: check.description,
        check_type: check.check_type,
        validation: check.validation,
        trigger_conditions: check.trigger_conditions,
        enforcement: check.enforcement,
        compliance_text: check.compliance_text,
        priority: index,
        enabled: check.enabled,
      }));

      const { error } = await (supabase as any)
        .from('compliance_checks')
        .insert(checksToInsert);

      if (error) throw error;

      toast.success('Compliance checks saved successfully');
      loadChecks();
    } catch (error) {
      console.error('Error saving compliance checks:', error);
      toast.error('Failed to save compliance checks');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading checks...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Ensure AI responses include required disclosures and compliance statements
        </p>
        <div className="flex gap-2">
          <Button onClick={addCheck} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Check
          </Button>
          <Button onClick={saveChecks} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </div>

      {checks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No compliance checks configured. Click "Add Check" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {checks.map((check, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-1 cursor-move" />
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <Input
                          value={check.name}
                          onChange={(e) => updateCheck(index, { name: e.target.value })}
                          className="text-lg font-semibold"
                          placeholder="Check name"
                        />
                        <Badge variant={check.enforcement === 'required' ? 'default' : 'secondary'}>
                          {check.enforcement}
                        </Badge>
                      </div>
                      <Textarea
                        value={check.description}
                        onChange={(e) => updateCheck(index, { description: e.target.value })}
                        placeholder="Describe this compliance requirement..."
                        className="min-h-[60px]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={check.enabled}
                      onCheckedChange={(checked) => updateCheck(index, { enabled: checked })}
                    />
                    <Button
                      onClick={() => deleteCheck(index)}
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
                    <Label>Check Type</Label>
                    <Select
                      value={check.check_type}
                      onValueChange={(value: any) => updateCheck(index, { check_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disclosure">Disclosure Statement</SelectItem>
                        <SelectItem value="consent">User Consent</SelectItem>
                        <SelectItem value="data_handling">Data Handling</SelectItem>
                        <SelectItem value="refund_policy">Refund Policy</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Enforcement</Label>
                    <Select
                      value={check.enforcement}
                      onValueChange={(value: any) => updateCheck(index, { enforcement: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="required">Required (Block if Missing)</SelectItem>
                        <SelectItem value="recommended">Recommended (Suggest)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Trigger Keywords (when to apply this check)</Label>
                  <Input
                    value={(check.trigger_conditions.keywords || []).join(', ')}
                    onChange={(e) =>
                      updateCheck(index, {
                        trigger_conditions: {
                          ...check.trigger_conditions,
                          keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean),
                        },
                      })
                    }
                    placeholder="e.g., refund, return, warranty"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated keywords that trigger this compliance check
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Compliance Text (auto-injected into response)</Label>
                  <Textarea
                    value={check.compliance_text}
                    onChange={(e) => updateCheck(index, { compliance_text: e.target.value })}
                    placeholder="The compliance statement to include in responses..."
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    This text will be automatically added to AI responses when triggered
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Required Keywords in Response</Label>
                  <Input
                    value={(check.validation.required_keywords || []).join(', ')}
                    onChange={(e) =>
                      updateCheck(index, {
                        validation: {
                          ...check.validation,
                          required_keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean),
                        },
                      })
                    }
                    placeholder="e.g., terms, conditions, policy"
                  />
                  <p className="text-xs text-muted-foreground">
                    Keywords that must be present in the AI response
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
