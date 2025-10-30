import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Copy, Edit, Trash2, BarChart3 } from 'lucide-react';
import { type AutomationFlow } from '@/contexts/AutomationsContext';
import { cn } from '@/lib/utils';

interface AutomationCardProps {
  automation: AutomationFlow;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onViewHistory: () => void;
}

export default function AutomationCard({
  automation,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
  onViewHistory,
}: AutomationCardProps) {
  const modeLabels = {
    manual: 'Manual',
    hitl: 'HITL',
    auto: 'Auto',
  };

  return (
    <div
      className={cn(
        'border border-border rounded-md p-5 bg-background transition-colors',
        automation.enabled && 'border-foreground/20'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Name & Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-medium text-sm truncate">{automation.name}</h3>
            <Badge variant="outline" className="text-xs shrink-0">
              {modeLabels[automation.mode]}
            </Badge>
            {automation.category === 'suggested' && (
              <Badge variant="secondary" className="text-xs shrink-0">
                Suggested
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {automation.description}
          </p>
          {/* Trigger & Actions Summary */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Trigger:</span>{' '}
              {automation.triggers[0]?.type || 'None'}
            </div>
            <div>
              <span className="font-medium">Actions:</span> {automation.actions.length}
            </div>
          </div>
        </div>

        {/* Right: Metrics, Toggle, Menu */}
        <div className="flex items-start gap-4 shrink-0">
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="text-muted-foreground">Triggers:</div>
            <div className="font-mono text-right">{automation.metrics.triggers}</div>
            <div className="text-muted-foreground">Sent:</div>
            <div className="font-mono text-right">{automation.metrics.messagesSent}</div>
            <div className="text-muted-foreground">Conv:</div>
            <div className="font-mono text-right">
              {automation.metrics.conversionRate.toFixed(1)}%
            </div>
            <div className="text-muted-foreground">Revenue:</div>
            <div className="font-mono text-right">
              ${automation.metrics.revenueInfluenced.toLocaleString()}
            </div>
          </div>

          {/* Toggle */}
          <div className="flex items-center gap-2 pt-1">
            <Switch checked={automation.enabled} onCheckedChange={onToggle} />
          </div>

          {/* Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewHistory}>
                <BarChart3 className="h-4 w-4 mr-2" />
                View History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Last Run */}
      {automation.lastRun && (
        <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
          Last run: {automation.lastRun}
        </div>
      )}
    </div>
  );
}
