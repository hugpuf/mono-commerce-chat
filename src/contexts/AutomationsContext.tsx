import React, { createContext, useContext, useState, useEffect } from 'react';

export type AutomationMode = 'manual' | 'hitl' | 'auto';

export interface AutomationTrigger {
  type: 'intent' | 'sentiment' | 'entity' | 'silence' | 'payment' | 'order' | 'stock' | 'optin';
  config: Record<string, any>;
}

export interface AutomationAction {
  type: 'send_message' | 'send_template' | 'generate_checkout' | 'tag' | 'assign' | 'escalate' | 'schedule' | 'update_order' | 'add_note' | 'pause_flow';
  config: Record<string, any>;
}

export interface AutomationFlow {
  id: string;
  name: string;
  description: string;
  triggers: AutomationTrigger[];
  conditions: string[];
  actions: AutomationAction[];
  mode: AutomationMode;
  enabled: boolean;
  category: 'suggested' | 'custom';
  lastRun?: string;
  metrics: {
    triggers: number;
    messagesSent: number;
    replyRate: number;
    conversionRate: number;
    revenueInfluenced: number;
  };
}

export interface GlobalAutomationSettings {
  mode: AutomationMode;
  confidenceThreshold: number;
  shadowMode: boolean;
  aiVoice: string;
  guardrails: {
    tone: string;
    doList: string[];
    dontList: string[];
    escalationRules: string;
    quietHours: string;
    compliance: string;
  };
}

interface AutomationsContextType {
  settings: GlobalAutomationSettings;
  automations: AutomationFlow[];
  updateSettings: (settings: Partial<GlobalAutomationSettings>) => void;
  addAutomation: (automation: AutomationFlow) => void;
  updateAutomation: (id: string, updates: Partial<AutomationFlow>) => void;
  deleteAutomation: (id: string) => void;
  duplicateAutomation: (id: string) => void;
}

const defaultSettings: GlobalAutomationSettings = {
  mode: 'hitl',
  confidenceThreshold: 80,
  shadowMode: false,
  aiVoice: 'Professional, friendly, and helpful. Keep responses concise and action-oriented.',
  guardrails: {
    tone: 'Professional and empathetic',
    doList: ['Acknowledge customer concerns', 'Provide clear next steps', 'Use approved templates outside 24h window'],
    dontList: ['Make promises we cannot keep', 'Discuss pricing without authorization', 'Share customer data'],
    escalationRules: 'Escalate if: customer is angry, issue requires manager approval, or refund > $500',
    quietHours: '10 PM - 8 AM local time',
    compliance: 'WhatsApp 24-hour window applies. Use approved templates only outside this window.',
  },
};

const suggestedAutomations: AutomationFlow[] = [
  {
    id: 'competitor-mention',
    name: 'Competitor Mention Response',
    description: 'Detect competitor mentions and propose price-match response',
    triggers: [{ type: 'entity', config: { entity: 'competitor' } }],
    conditions: ['Competitor brand detected in message'],
    actions: [
      { type: 'send_message', config: { template: 'competitor_response' } },
      { type: 'escalate', config: { if: 'price_match_needed' } },
    ],
    mode: 'hitl',
    enabled: false,
    category: 'suggested',
    metrics: { triggers: 0, messagesSent: 0, replyRate: 0, conversionRate: 0, revenueInfluenced: 0 },
  },
  {
    id: 'high-negative-sentiment',
    name: 'Outrage / High Negative Sentiment',
    description: 'Apologize, summarize issue, and offer call or handoff',
    triggers: [{ type: 'sentiment', config: { threshold: -0.7 } }],
    conditions: ['Sentiment score < -0.7'],
    actions: [
      { type: 'send_message', config: { template: 'apology' } },
      { type: 'escalate', config: { to: 'senior_agent' } },
    ],
    mode: 'auto',
    enabled: false,
    category: 'suggested',
    metrics: { triggers: 0, messagesSent: 0, replyRate: 0, conversionRate: 0, revenueInfluenced: 0 },
  },
  {
    id: 'silent-unpaid',
    name: 'Silent After 10 Minutes (Unpaid)',
    description: 'Nudge with original items and checkout link',
    triggers: [{ type: 'silence', config: { minutes: 10, unpaid: true } }],
    conditions: ['No reply for 10 min', 'Payment link sent but unpaid'],
    actions: [{ type: 'send_message', config: { includeCheckout: true } }],
    mode: 'auto',
    enabled: false,
    category: 'suggested',
    metrics: { triggers: 0, messagesSent: 0, replyRate: 0, conversionRate: 0, revenueInfluenced: 0 },
  },
  {
    id: 'abandoned-checkout-30',
    name: 'Abandoned Checkout (30 min)',
    description: 'First reminder with invoice/checkout link',
    triggers: [{ type: 'silence', config: { minutes: 30, unpaid: true } }],
    conditions: ['Checkout link sent 30 min ago', 'Not paid'],
    actions: [{ type: 'send_message', config: { template: 'checkout_reminder' } }],
    mode: 'auto',
    enabled: false,
    category: 'suggested',
    metrics: { triggers: 0, messagesSent: 0, replyRate: 0, conversionRate: 0, revenueInfluenced: 0 },
  },
  {
    id: 'abandoned-checkout-120',
    name: 'Abandoned Checkout (120 min)',
    description: 'Second reminder with optional incentive',
    triggers: [{ type: 'silence', config: { minutes: 120, unpaid: true } }],
    conditions: ['Checkout link sent 120 min ago', 'Not paid'],
    actions: [
      { type: 'send_message', config: { template: 'checkout_reminder_incentive' } },
    ],
    mode: 'hitl',
    enabled: false,
    category: 'suggested',
    metrics: { triggers: 0, messagesSent: 0, replyRate: 0, conversionRate: 0, revenueInfluenced: 0 },
  },
  {
    id: 'payment-success',
    name: 'Payment Success → Send Invoice',
    description: 'Send PDF invoice + thank-you + related items',
    triggers: [{ type: 'payment', config: { status: 'success' } }],
    conditions: ['Payment completed'],
    actions: [
      { type: 'send_message', config: { template: 'invoice', attachPdf: true } },
      { type: 'add_note', config: { note: 'Invoice sent' } },
    ],
    mode: 'auto',
    enabled: false,
    category: 'suggested',
    metrics: { triggers: 0, messagesSent: 0, replyRate: 0, conversionRate: 0, revenueInfluenced: 0 },
  },
  {
    id: 'high-purchase-intent',
    name: 'High Purchase Intent',
    description: 'Auto-draft order link when customer asks for qty/price',
    triggers: [{ type: 'intent', config: { intent: 'purchase_intent', confidence: 0.8 } }],
    conditions: ['Purchase intent detected', 'Confidence > 80%'],
    actions: [{ type: 'generate_checkout', config: { requireApproval: true } }],
    mode: 'hitl',
    enabled: false,
    category: 'suggested',
    metrics: { triggers: 0, messagesSent: 0, replyRate: 0, conversionRate: 0, revenueInfluenced: 0 },
  },
  {
    id: 'out-of-hours',
    name: 'Out-of-Hours Auto-Reply',
    description: 'Acknowledge, set expectations, collect details',
    triggers: [{ type: 'optin', config: { duringQuietHours: true } }],
    conditions: ['Message received during quiet hours'],
    actions: [
      { type: 'send_template', config: { template: 'out_of_hours' } },
      { type: 'tag', config: { tag: 'after_hours' } },
    ],
    mode: 'auto',
    enabled: false,
    category: 'suggested',
    metrics: { triggers: 0, messagesSent: 0, replyRate: 0, conversionRate: 0, revenueInfluenced: 0 },
  },
  {
    id: 'back-in-stock',
    name: 'Back-in-Stock Alert',
    description: 'Notify interested customers with product card',
    triggers: [{ type: 'stock', config: { event: 'restock' } }],
    conditions: ['Product back in stock', 'Customer previously interested'],
    actions: [{ type: 'send_message', config: { includeProductCard: true } }],
    mode: 'auto',
    enabled: false,
    category: 'suggested',
    metrics: { triggers: 0, messagesSent: 0, replyRate: 0, conversionRate: 0, revenueInfluenced: 0 },
  },
  {
    id: 'delivery-issue',
    name: 'Delivery Issue Detected',
    description: 'Open return/refund path if "late/damaged" detected',
    triggers: [{ type: 'intent', config: { intent: 'delivery_issue' } }],
    conditions: ['Late or damaged delivery intent'],
    actions: [
      { type: 'send_message', config: { template: 'delivery_issue' } },
      { type: 'escalate', config: { to: 'operations' } },
    ],
    mode: 'hitl',
    enabled: false,
    category: 'suggested',
    metrics: { triggers: 0, messagesSent: 0, replyRate: 0, conversionRate: 0, revenueInfluenced: 0 },
  },
  {
    id: 'vip-fast-track',
    name: 'VIP Fast Track',
    description: 'Route high LTV customers to priority queue',
    triggers: [{ type: 'optin', config: { ltvThreshold: 5000 } }],
    conditions: ['Customer LTV > $5000'],
    actions: [
      { type: 'tag', config: { tag: 'vip' } },
      { type: 'assign', config: { queue: 'priority' } },
    ],
    mode: 'auto',
    enabled: false,
    category: 'suggested',
    metrics: { triggers: 0, messagesSent: 0, replyRate: 0, conversionRate: 0, revenueInfluenced: 0 },
  },
];

const AutomationsContext = createContext<AutomationsContextType | undefined>(undefined);

export function AutomationsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<GlobalAutomationSettings>(() => {
    const saved = localStorage.getItem('automationSettings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  const [automations, setAutomations] = useState<AutomationFlow[]>(() => {
    const saved = localStorage.getItem('automations');
    return saved ? JSON.parse(saved) : suggestedAutomations;
  });

  useEffect(() => {
    localStorage.setItem('automationSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('automations', JSON.stringify(automations));
  }, [automations]);

  const updateSettings = (newSettings: Partial<GlobalAutomationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const addAutomation = (automation: AutomationFlow) => {
    setAutomations(prev => [...prev, automation]);
  };

  const updateAutomation = (id: string, updates: Partial<AutomationFlow>) => {
    setAutomations(prev =>
      prev.map(a => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const deleteAutomation = (id: string) => {
    setAutomations(prev => prev.filter(a => a.id !== id));
  };

  const duplicateAutomation = (id: string) => {
    const automation = automations.find(a => a.id === id);
    if (automation) {
      const duplicate: AutomationFlow = {
        ...automation,
        id: `${automation.id}-copy-${Date.now()}`,
        name: `${automation.name} (Copy)`,
        category: 'custom',
      };
      addAutomation(duplicate);
    }
  };

  return (
    <AutomationsContext.Provider
      value={{
        settings,
        automations,
        updateSettings,
        addAutomation,
        updateAutomation,
        deleteAutomation,
        duplicateAutomation,
      }}
    >
      {children}
    </AutomationsContext.Provider>
  );
}

export function useAutomations() {
  const context = useContext(AutomationsContext);
  if (!context) {
    throw new Error('useAutomations must be used within AutomationsProvider');
  }
  return context;
}
