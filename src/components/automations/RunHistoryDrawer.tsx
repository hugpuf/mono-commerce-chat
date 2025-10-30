import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';

interface RunHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automationId: string;
  automationName: string;
}

interface RunLog {
  id: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending' | 'skipped';
  trigger: string;
  input: string;
  output: string;
  decisions: string[];
  error?: string;
}

const mockLogs: RunLog[] = [
  {
    id: '1',
    timestamp: '2025-10-30 14:32:15',
    status: 'success',
    trigger: 'High negative sentiment detected',
    input: 'Customer message: "This is unacceptable! I want a refund NOW!"',
    output: 'Sent apology message and escalated to senior agent',
    decisions: [
      'Sentiment score: -0.85 (threshold: -0.7)',
      'Matched template: apology',
      'Escalated to: senior_agent',
    ],
  },
  {
    id: '2',
    timestamp: '2025-10-30 13:15:42',
    status: 'success',
    trigger: 'Competitor mention detected',
    input: 'Customer message: "I saw Brand X offering this for $50 less"',
    output: 'Sent competitor response, awaiting manager approval for price match',
    decisions: [
      'Detected competitor: Brand X',
      'Price difference: $50',
      'Requires approval: Yes',
    ],
  },
  {
    id: '3',
    timestamp: '2025-10-30 12:45:10',
    status: 'skipped',
    trigger: 'Silent after 10 minutes (unpaid)',
    input: 'No customer reply for 10 minutes',
    output: 'Skipped: Customer in quiet hours window',
    decisions: ['Customer timezone: EST', 'Current time: 11:45 PM', 'Within quiet hours: Yes'],
  },
  {
    id: '4',
    timestamp: '2025-10-30 11:20:33',
    status: 'error',
    trigger: 'Payment success',
    input: 'Order #1234 paid successfully',
    output: 'Failed to send invoice',
    decisions: ['PDF generation failed', 'Template not found: invoice'],
    error: 'Template "invoice" does not exist. Please create or select an approved template.',
  },
];

export default function RunHistoryDrawer({
  open,
  onOpenChange,
  automationName,
}: RunHistoryDrawerProps) {
  const [logs] = useState(mockLogs);

  const getStatusIcon = (status: RunLog['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: RunLog['status']) => {
    const variants = {
      success: 'default',
      error: 'destructive',
      pending: 'secondary',
      skipped: 'outline',
    } as const;
    return (
      <Badge variant={variants[status]} className="text-xs">
        {status}
      </Badge>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>{automationName}</SheetTitle>
          <SheetDescription>Run history and execution logs</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          <div className="space-y-4 pr-4">
            {logs.map(log => (
              <div key={log.id} className="border border-border rounded-md p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(log.status)}
                    <span className="text-xs font-mono text-muted-foreground">
                      {log.timestamp}
                    </span>
                  </div>
                  {getStatusBadge(log.status)}
                </div>

                {/* Trigger */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Trigger</div>
                  <div className="text-sm">{log.trigger}</div>
                </div>

                {/* Input */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Input</div>
                  <div className="text-sm bg-muted/50 rounded px-3 py-2 font-mono">{log.input}</div>
                </div>

                {/* Decisions */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Decisions</div>
                  <ul className="space-y-1">
                    {log.decisions.map((decision, idx) => (
                      <li key={idx} className="text-xs flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{decision}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Output */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Output</div>
                  <div className="text-sm">{log.output}</div>
                </div>

                {/* Error */}
                {log.error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
                    <div className="text-xs font-medium text-destructive mb-1">Error</div>
                    <div className="text-sm text-destructive">{log.error}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
