import { useState } from 'react';
import { User, Wrench, Wand2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useAutomations, type AutomationMode } from '@/contexts/AutomationsContext';
import { useToast } from '@/hooks/use-toast';
import { WorkflowSettingsDialog } from './WorkflowSettingsDialog';

export function WorkflowSettingsPreview() {
  const { settings, updateSettings } = useAutomations();
  const [updating, setUpdating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { toast } = useToast();

  const segmentedOptions = [
    { value: 'manual', label: 'Manual', icon: <User className="h-4 w-4" /> },
    { value: 'hitl', label: 'HITL', icon: <Wrench className="h-4 w-4" /> },
    { value: 'auto', label: 'AI', icon: <Wand2 className="h-4 w-4" /> },
  ];

  const modeDescriptions = {
    manual: 'Review every action',
    hitl: 'Approve low-confidence actions',
    auto: 'Full automation'
  };

  const handleModeChange = async (newMode: AutomationMode) => {
    if (newMode === settings.mode || updating) return;

    setUpdating(true);
    
    try {
      await updateSettings({ mode: newMode });
      
      const modeLabel = segmentedOptions.find(m => m.value === newMode)?.label;
      toast({
        title: "Mode updated",
        description: `Switched to ${modeLabel} mode`,
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

  const activeDescription = modeDescriptions[settings.mode];

  return (
    <>
      <div className="border-b border-border bg-background px-6 py-3">
        <div className="flex items-center justify-between gap-6">
          {/* Left Group: Mode Selector + Description */}
          <div className="flex items-center gap-4">
            <SegmentedControl
              options={segmentedOptions}
              value={settings.mode}
              onChange={(value) => handleModeChange(value as AutomationMode)}
              className="flex-shrink-0"
            />
            
            {/* Active Mode Description */}
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <span>{activeDescription}</span>
            </div>
          </div>

          {/* Right Group: Threshold Badge + Settings */}
          <div className="flex items-center gap-3">
            {/* Confidence Threshold Badge (only for HITL and Auto) */}
            {(settings.mode === 'hitl' || settings.mode === 'auto') && (
              <Badge variant="secondary" className="font-mono text-xs">
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
