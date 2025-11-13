import { useState } from 'react';
import { User, Wand2, Zap, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAutomations, type AutomationMode } from '@/contexts/AutomationsContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { WorkflowSettingsDialog } from './WorkflowSettingsDialog';

export function WorkflowSettingsPreview() {
  const { settings, updateSettings } = useAutomations();
  const [updating, setUpdating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { toast } = useToast();

  const modes: { 
    value: AutomationMode; 
    label: string; 
    icon: typeof User;
    description: string;
  }[] = [
    { 
      value: 'manual', 
      label: 'Manual', 
      icon: User,
      description: 'Review every action'
    },
    { 
      value: 'hitl', 
      label: 'HITL', 
      icon: Wand2,
      description: 'Approve low-confidence actions'
    },
    { 
      value: 'auto', 
      label: 'Total AI', 
      icon: Zap,
      description: 'Full automation'
    },
  ];

  const handleModeChange = async (newMode: AutomationMode) => {
    if (newMode === settings.mode || updating) return;

    setUpdating(true);
    
    try {
      await updateSettings({ mode: newMode });
      
      toast({
        title: "Mode updated",
        description: `Switched to ${modes.find(m => m.value === newMode)?.label} mode`,
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update workflow mode",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const activeMode = modes.find(m => m.value === settings.mode);

  return (
    <>
      <div className="border-b border-border bg-background px-6 py-3">
        <div className="flex items-center justify-between gap-6">
          {/* Mode Selector */}
          <div className="flex items-center gap-2">
            {modes.map((mode) => {
              const Icon = mode.icon;
              const isActive = settings.mode === mode.value;
              
              return (
                <button
                  key={mode.value}
                  onClick={() => handleModeChange(mode.value)}
                  disabled={updating}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                    "border border-border hover:border-accent/50",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    isActive && "bg-accent/10 border-accent text-accent font-medium"
                  )}
                >
                  <Icon className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? "text-accent" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm transition-colors",
                    isActive ? "text-accent" : "text-muted-foreground"
                  )}>
                    {mode.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status Info */}
          <div className="flex items-center gap-4">
            {/* Active Mode Description */}
            {activeMode && (
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <span>{activeMode.description}</span>
              </div>
            )}

            {/* Confidence Threshold Badge (only for HITL and Auto) */}
            {(settings.mode === 'hitl' || settings.mode === 'auto') && (
              <Badge variant="secondary" className="font-mono">
                {settings.confidenceThreshold}% threshold
              </Badge>
            )}

            {/* Settings Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="flex-shrink-0"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Loading Indicator */}
        {updating && (
          <div className="mt-2 h-0.5 bg-accent/20 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-accent animate-pulse" />
          </div>
        )}
      </div>

      <WorkflowSettingsDialog 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen} 
      />
    </>
  );
}
