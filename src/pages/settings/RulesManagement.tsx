import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GuardrailRuleBuilder } from '@/components/rules/GuardrailRuleBuilder';
import { EscalationPolicyBuilder } from '@/components/rules/EscalationPolicyBuilder';
import { BusinessHoursBuilder } from '@/components/rules/BusinessHoursBuilder';
import { ComplianceCheckBuilder } from '@/components/rules/ComplianceCheckBuilder';
import { Shield, AlertTriangle, Clock, FileCheck } from 'lucide-react';

export default function RulesManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Rules & Policies</h1>
        <p className="text-muted-foreground mt-1">
          Configure guardrails, escalation policies, business hours, and compliance checks for your AI assistant
        </p>
      </div>

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
