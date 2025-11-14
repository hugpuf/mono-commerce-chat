import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { GuardrailRuleBuilder } from '@/components/rules/GuardrailRuleBuilder';
import { EscalationPolicyBuilder } from '@/components/rules/EscalationPolicyBuilder';
import { BusinessHoursBuilder } from '@/components/rules/BusinessHoursBuilder';
import { ComplianceCheckBuilder } from '@/components/rules/ComplianceCheckBuilder';
import { Shield, AlertTriangle, Clock, FileCheck, Save, Sparkles } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function RulesManagement() {
  const { workspace } = useWorkspace();
  const [brandVoice, setBrandVoice] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workspace?.id) {
      loadBrandVoice();
    }
  }, [workspace?.id]);

  const loadBrandVoice = async () => {
    if (!workspace?.id) return;

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('workspace_ai_settings')
        .select('ai_voice')
        .eq('workspace_id', workspace.id)
        .maybeSingle();

      if (error) throw error;
      if (data?.ai_voice) {
        setBrandVoice(data.ai_voice);
      }
    } catch (error) {
      console.error('Error loading brand voice:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveBrandVoice = async () => {
    if (!workspace?.id) return;

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('workspace_ai_settings')
        .upsert({
          workspace_id: workspace.id,
          ai_voice: brandVoice,
        }, {
          onConflict: 'workspace_id'
        });

      if (error) throw error;

      toast.success('Brand voice updated successfully');
    } catch (error) {
      console.error('Error saving brand voice:', error);
      toast.error('Failed to save brand voice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Rules & Policies</h1>
        <p className="text-muted-foreground mt-1">
          Configure guardrails, escalation policies, business hours, and compliance checks for your AI assistant
        </p>
      </div>

      {/* Brand Voice Section */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Brand Voice & Tone</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Define how your AI assistant should communicate. This guides the AI's personality, tone, and style across all interactions.
          </p>
          <Textarea
            value={brandVoice}
            onChange={(e) => setBrandVoice(e.target.value)}
            placeholder="e.g., Professional, friendly, and helpful. Keep responses concise and action-oriented. Use a warm tone that makes customers feel valued. Avoid jargon and speak in simple, clear language."
            className="min-h-[120px]"
            disabled={loading}
          />
          <div className="flex justify-end">
            <Button onClick={saveBrandVoice} disabled={saving || loading} size="sm">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Brand Voice'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="guardrails" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="guardrails" className="gap-2">
            <Shield className="h-4 w-4" />
            Guardrails
          </TabsTrigger>
          <TabsTrigger value="escalation" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Escalation
          </TabsTrigger>
          <TabsTrigger value="hours" className="gap-2">
            <Clock className="h-4 w-4" />
            Business Hours
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2">
            <FileCheck className="h-4 w-4" />
            Compliance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guardrails" className="space-y-4">
          <GuardrailRuleBuilder />
        </TabsContent>

        <TabsContent value="escalation" className="space-y-4">
          <EscalationPolicyBuilder />
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          <BusinessHoursBuilder />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <ComplianceCheckBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
}
