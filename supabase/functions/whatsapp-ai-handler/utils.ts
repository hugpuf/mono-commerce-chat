import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Rule Evaluation Engine

export interface GuardrailViolation {
  ruleId: string;
  ruleName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  enforcement: 'block' | 'escalate' | 'warn' | 'modify';
  fallbackMessage?: string;
  reason: string;
}

export interface EscalationMatch {
  policyId: string;
  policyName: string;
  triggers: string[];
  routing: any;
  behavior: any;
}

export interface ComplianceResult {
  passed: boolean;
  required: boolean;
  suggestions: string[];
  checksFailed: string[];
}

export async function evaluateGuardrailRules(
  response: string,
  conversation: any,
  workspaceId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<GuardrailViolation[]> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: rules, error } = await supabase
    .from('guardrail_rules')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('enabled', true)
    .order('priority', { ascending: true });

  if (error || !rules) {
    console.error('Failed to load guardrail rules:', error);
    return [];
  }

  const violations: GuardrailViolation[] = [];

  for (const rule of rules) {
    let violated = false;
    let reason = '';

    switch (rule.type) {
      case 'keyword':
        const keywords = rule.condition.keywords || [];
        const mode = rule.condition.mode || 'any';
        const caseSensitive = rule.condition.caseSensitive || false;
        const text = caseSensitive ? response : response.toLowerCase();
        
        const matches = keywords.filter((kw: string) => 
          text.includes(caseSensitive ? kw : kw.toLowerCase())
        );
        
        if (mode === 'any' && matches.length > 0) {
          violated = true;
          reason = `Contains forbidden keyword(s): ${matches.join(', ')}`;
        } else if (mode === 'all' && matches.length === keywords.length) {
          violated = true;
          reason = `Contains all forbidden keywords: ${matches.join(', ')}`;
        }
        break;

      case 'length':
        const maxLength = rule.condition.maxLength || Infinity;
        const minLength = rule.condition.minLength || 0;
        
        if (response.length > maxLength) {
          violated = true;
          reason = `Response too long (${response.length} > ${maxLength} characters)`;
        } else if (response.length < minLength) {
          violated = true;
          reason = `Response too short (${response.length} < ${minLength} characters)`;
        }
        break;

      case 'pattern':
        const pattern = rule.condition.pattern;
        if (pattern) {
          const regex = new RegExp(pattern, rule.condition.flags || 'i');
          if (regex.test(response)) {
            violated = true;
            reason = `Matches forbidden pattern: ${pattern}`;
          }
        }
        break;

      case 'sentiment':
        const sentimentThreshold = rule.condition.threshold || -0.7;
        if (conversation.sentimentScore !== undefined && conversation.sentimentScore < sentimentThreshold) {
          violated = true;
          reason = `Customer sentiment too negative (${conversation.sentimentScore.toFixed(2)})`;
        }
        break;
    }

    if (violated) {
      violations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.metadata?.severity || 'medium',
        enforcement: rule.enforcement,
        fallbackMessage: rule.fallback_message,
        reason
      });
    }
  }

  return violations;
}

export async function checkEscalationPolicies(
  conversation: any,
  workspaceId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<EscalationMatch | null> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: policies, error } = await supabase
    .from('escalation_policies')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('enabled', true)
    .order('priority', { ascending: true });

  if (error || !policies) {
    console.error('Failed to load escalation policies:', error);
    return null;
  }

  for (const policy of policies) {
    const triggers = policy.triggers || [];
    const matchedTriggers: string[] = [];

    for (const trigger of triggers) {
      let matched = false;

      switch (trigger.type) {
        case 'sentiment':
          if (conversation.sentimentScore !== undefined && 
              conversation.sentimentScore < (trigger.threshold || -0.7)) {
            matched = true;
          }
          break;

        case 'confidence':
          if (conversation.confidenceScore !== undefined && 
              conversation.confidenceScore < (trigger.threshold || 0.5)) {
            matched = true;
          }
          break;

        case 'cart_value':
          if (conversation.cart_total !== undefined && 
              conversation.cart_total > (trigger.threshold || 1000)) {
            matched = true;
          }
          break;

        case 'message_count':
          if (conversation.messageCount !== undefined && 
              conversation.messageCount > (trigger.threshold || 10)) {
            matched = true;
          }
          break;

        case 'keyword':
          const keywords = trigger.keywords || [];
          if (conversation.lastMessage && 
              keywords.some((kw: string) => conversation.lastMessage.toLowerCase().includes(kw.toLowerCase()))) {
            matched = true;
          }
          break;

        case 'time_since_last_reply':
          if (conversation.lastMessageAt) {
            const hoursSince = (Date.now() - new Date(conversation.lastMessageAt).getTime()) / (1000 * 60 * 60);
            if (hoursSince > (trigger.threshold || 24)) {
              matched = true;
            }
          }
          break;
      }

      if (matched) {
        matchedTriggers.push(trigger.type);
      }
    }

    const matchMode = policy.behavior?.matchMode || 'any';
    const shouldTrigger = matchMode === 'any' 
      ? matchedTriggers.length > 0 
      : matchedTriggers.length === triggers.length;

    if (shouldTrigger) {
      return {
        policyId: policy.id,
        policyName: policy.name,
        triggers: matchedTriggers,
        routing: policy.routing,
        behavior: policy.behavior
      };
    }
  }

  return null;
}

export async function isWithinBusinessHours(
  workspaceId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: config, error } = await supabase
    .from('business_hours_config')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('enabled', true)
    .single();

  if (error || !config) {
    console.log('No business hours config found, assuming 24/7');
    return true;
  }

  const now = new Date();
  const timezone = config.timezone || 'UTC';
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const dayName = parts.find(p => p.type === 'weekday')?.value || '';
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const currentTime = hour * 60 + minute;

  const holidays = config.holidays || [];
  const today = now.toISOString().split('T')[0];
  if (holidays.includes(today)) {
    return false;
  }

  const schedule = config.schedule || [];
  const daySchedule = schedule.find((s: any) => s.day === dayName);
  
  if (!daySchedule || !daySchedule.enabled) {
    return false;
  }

  const [startHour, startMin] = daySchedule.start.split(':').map(Number);
  const [endHour, endMin] = daySchedule.end.split(':').map(Number);
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  return currentTime >= startTime && currentTime <= endTime;
}

export async function validateComplianceChecks(
  response: string,
  conversation: any,
  workspaceId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<ComplianceResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: checks, error } = await supabase
    .from('compliance_checks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('enabled', true)
    .order('priority', { ascending: true });

  if (error || !checks) {
    console.error('Failed to load compliance checks:', error);
    return { passed: true, required: false, suggestions: [], checksFailed: [] };
  }

  const suggestions: string[] = [];
  const checksFailed: string[] = [];
  let hasRequiredFailure = false;

  for (const check of checks) {
    let shouldRun = true;

    if (check.trigger_conditions) {
      const triggers = check.trigger_conditions;
      
      if (triggers.keywords && Array.isArray(triggers.keywords)) {
        shouldRun = triggers.keywords.some((kw: string) => 
          conversation.lastMessage?.toLowerCase().includes(kw.toLowerCase())
        );
      }
    }

    if (!shouldRun) continue;

    let passed = false;

    switch (check.check_type) {
      case 'keyword':
        const requiredKeywords = check.validation.keywords || [];
        passed = requiredKeywords.every((kw: string) => 
          response.toLowerCase().includes(kw.toLowerCase())
        );
        break;

      case 'pattern':
        const pattern = check.validation.pattern;
        if (pattern) {
          const regex = new RegExp(pattern, check.validation.flags || 'i');
          passed = regex.test(response);
        } else {
          passed = true;
        }
        break;

      case 'disclosure':
        const disclosureText = check.validation.disclosureText || '';
        passed = response.includes(disclosureText);
        break;

      case 'consent':
        const consentPhrases = check.validation.consentPhrases || [];
        passed = consentPhrases.some((phrase: string) => 
          response.toLowerCase().includes(phrase.toLowerCase())
        );
        break;
    }

    if (!passed) {
      checksFailed.push(check.name);
      
      if (check.enforcement === 'required') {
        hasRequiredFailure = true;
      }

      if (check.compliance_text) {
        suggestions.push(check.compliance_text);
      }
    }
  }

  return {
    passed: !hasRequiredFailure,
    required: hasRequiredFailure,
    suggestions,
    checksFailed
  };
}

export async function checkQuietHours(
  quietHours: any,
  timezone: string = 'UTC'
): Promise<boolean> {
  if (!quietHours || !Array.isArray(quietHours) || quietHours.length === 0) {
    return false;
  }

  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const dayName = parts.find(p => p.type === 'weekday')?.value || '';
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const currentTime = hour * 60 + minute;

  let isQuietHour = false;
  for (const period of quietHours) {
    if (!period.enabled || !period.days?.includes(dayName)) continue;

    const [startHour, startMin] = period.start.split(':').map(Number);
    const [endHour, endMin] = period.end.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (currentTime >= startTime && currentTime <= endTime) {
      isQuietHour = true;
      break;
    }
  }

  return isQuietHour;
}

export async function analyzeSentiment(message: string): Promise<number> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are a sentiment analyzer. Respond ONLY with a number between -1 and 1, where -1 is extremely negative/angry, 0 is neutral, and 1 is extremely positive. No explanation, just the number." 
          },
          { role: "user", content: `Analyze sentiment: "${message}"` }
        ]
      })
    });

    if (!response.ok) {
      console.error('Sentiment analysis failed:', response.status);
      return 0;
    }

    const data = await response.json();
    const sentimentText = data.choices[0]?.message?.content?.trim() || "0";
    const sentiment = parseFloat(sentimentText);
    
    return isNaN(sentiment) ? 0 : Math.max(-1, Math.min(1, sentiment));
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return 0;
  }
}

export function shouldInjectCompliance(message: string, complianceNotes: string): boolean {
  const complianceKeywords = [
    'refund', 'return', 'warranty', 'exchange', 'cancel',
    'money back', 'guarantee', 'policy', 'terms', 'conditions'
  ];

  const lowerMessage = message.toLowerCase();
  return complianceKeywords.some(keyword => lowerMessage.includes(keyword));
}
