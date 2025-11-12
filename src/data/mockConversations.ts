// Mock data for demo conversations page

export interface MockMessage {
  id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  created_at: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface MockConversation {
  id: string;
  customer_name: string;
  customer_phone: string;
  last_message_at: string;
  last_message_preview: string;
  unread_count: number;
  status: 'open' | 'closed';
}

export const mockConversations: MockConversation[] = [
  {
    id: '1',
    customer_name: 'Sarah Johnson',
    customer_phone: '+1234567890',
    last_message_at: new Date(Date.now() - 5 * 60000).toISOString(),
    last_message_preview: 'Thanks! When will it arrive?',
    unread_count: 2,
    status: 'open'
  },
  {
    id: '2',
    customer_name: 'Michael Chen',
    customer_phone: '+1234567891',
    last_message_at: new Date(Date.now() - 30 * 60000).toISOString(),
    last_message_preview: 'Perfect, I\'ll take it!',
    unread_count: 0,
    status: 'open'
  },
  {
    id: '3',
    customer_name: 'Emma Williams',
    customer_phone: '+1234567892',
    last_message_at: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    last_message_preview: 'Do you have this in blue?',
    unread_count: 1,
    status: 'open'
  },
  {
    id: '4',
    customer_name: 'James Martinez',
    customer_phone: '+1234567893',
    last_message_at: new Date(Date.now() - 24 * 60 * 60000).toISOString(),
    last_message_preview: 'Great! I\'ll order now.',
    unread_count: 0,
    status: 'closed'
  },
  {
    id: '5',
    customer_name: 'Olivia Brown',
    customer_phone: '+1234567894',
    last_message_at: new Date(Date.now() - 48 * 60 * 60000).toISOString(),
    last_message_preview: 'What are your store hours?',
    unread_count: 0,
    status: 'closed'
  }
];

export const mockMessages: Record<string, MockMessage[]> = {
  '1': [
    {
      id: 'm1',
      content: 'Hi! I\'m interested in the blue running shoes.',
      direction: 'inbound',
      created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    },
    {
      id: 'm2',
      content: 'Hello Sarah! Those are great shoes. They\'re currently in stock in sizes 6-10. What size do you need?',
      direction: 'outbound',
      created_at: new Date(Date.now() - 14 * 60000).toISOString(),
      status: 'read'
    },
    {
      id: 'm3',
      content: 'Size 8 please!',
      direction: 'inbound',
      created_at: new Date(Date.now() - 10 * 60000).toISOString(),
    },
    {
      id: 'm4',
      content: 'Perfect! I have those available. They\'re $89.99. Would you like me to create an order for you?',
      direction: 'outbound',
      created_at: new Date(Date.now() - 9 * 60000).toISOString(),
      status: 'read'
    },
    {
      id: 'm5',
      content: 'Yes please!',
      direction: 'inbound',
      created_at: new Date(Date.now() - 6 * 60000).toISOString(),
    },
    {
      id: 'm6',
      content: 'Great! I\'ve created your order. Here\'s the payment link: pay.example.com/abc123',
      direction: 'outbound',
      created_at: new Date(Date.now() - 5 * 60000).toISOString(),
      status: 'delivered'
    },
    {
      id: 'm7',
      content: 'Thanks! When will it arrive?',
      direction: 'inbound',
      created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    }
  ],
  '2': [
    {
      id: 'm8',
      content: 'Do you have the wireless headphones in black?',
      direction: 'inbound',
      created_at: new Date(Date.now() - 60 * 60000).toISOString(),
    },
    {
      id: 'm9',
      content: 'Yes! We have the black wireless headphones in stock. They\'re $149.99 with noise cancellation.',
      direction: 'outbound',
      created_at: new Date(Date.now() - 58 * 60000).toISOString(),
      status: 'read'
    },
    {
      id: 'm10',
      content: 'Perfect, I\'ll take it!',
      direction: 'inbound',
      created_at: new Date(Date.now() - 30 * 60000).toISOString(),
    }
  ],
  '3': [
    {
      id: 'm11',
      content: 'Hi, I saw your summer dress collection!',
      direction: 'inbound',
      created_at: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
    },
    {
      id: 'm12',
      content: 'Hello Emma! Yes, we just launched our summer collection. What style are you looking for?',
      direction: 'outbound',
      created_at: new Date(Date.now() - 2.5 * 60 * 60000).toISOString(),
      status: 'read'
    },
    {
      id: 'm13',
      content: 'Do you have this in blue?',
      direction: 'inbound',
      created_at: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    }
  ],
  '4': [
    {
      id: 'm14',
      content: 'Hello! What\'s the warranty on laptops?',
      direction: 'inbound',
      created_at: new Date(Date.now() - 25 * 60 * 60000).toISOString(),
    },
    {
      id: 'm15',
      content: 'Hi James! All our laptops come with a 1-year manufacturer warranty. Would you like to add extended warranty?',
      direction: 'outbound',
      created_at: new Date(Date.now() - 24.5 * 60 * 60000).toISOString(),
      status: 'read'
    },
    {
      id: 'm16',
      content: 'Great! I\'ll order now.',
      direction: 'inbound',
      created_at: new Date(Date.now() - 24 * 60 * 60000).toISOString(),
    }
  ],
  '5': [
    {
      id: 'm17',
      content: 'What are your store hours?',
      direction: 'inbound',
      created_at: new Date(Date.now() - 48 * 60 * 60000).toISOString(),
    },
    {
      id: 'm18',
      content: 'We\'re open Monday-Saturday 9AM-8PM and Sunday 10AM-6PM. Can I help you with anything else?',
      direction: 'outbound',
      created_at: new Date(Date.now() - 47.5 * 60 * 60000).toISOString(),
      status: 'read'
    }
  ]
};
