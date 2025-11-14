import { useState } from 'react';
import { User, Wrench, Wand2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { useAutomations, type AutomationMode } from '@/contexts/AutomationsContext';
import { useToast } from '@/hooks/use-toast';
import { WorkflowSettingsDialog } from './WorkflowSettingsDialog';

export function WorkflowSettingsPreview() {
  const { settings, updateSettings } = useAutomations();
  const [updating, setUpdating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [thresholdOpen, setThresholdOpen] = useState(false);
  const { toast } = useToast();

  const segmentedOptions = [
    { value: 'manual', label: 'Manual', icon: <User className="h-4 w-4" /> },
    { value: 'hitl', label: 'HITL', icon: <Wrench className="h-4 w-4" /> },
    { value: 'auto', label: 'AI', icon: <Wand2 className="h-4 w-4" /> },
  ];

  const modeDescriptions = {
    manual: 'Review every action',
    hitl: 'Approve low-confidence actions',
    auto: 'Full AI - instant responses'
  } as const;

  const handleModeChange = async (newMode: AutomationMode) => {
    if (newMode === settings.mode || updating) return;

    setUpdating(true);
    
    // Store previous mode for rollback
    const previousMode = settings.mode;
    
    try {
      await updateSettings({ mode: newMode });
      
      const modeLabel = segmentedOptions.find(m => m.value === newMode)?.label;
      toast({
        title: "Mode updated",
        description: `Switched to ${modeLabel} mode`,
      });
    } catch (error: any) {
      // Show detailed error message
      const errorMessage = error?.message || "Failed to update workflow mode";
      toast({
        title: "Update failed",
        description: errorMessage,
        variant: "destructive"
      });
      console.error('Mode change error:', error);
    } finally {
      setUpdating(false);
    }
  };

  const activeDescription = modeDescriptions[settings.mode];

  return (
    <>
      <div className="border-b border-border bg-background px-4 md:px-6 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-6">
          {/* Left Group: Mode Selector + Description */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <SegmentedControl
              options={segmentedOptions}
              value={settings.mode}
              onChange={(value) => handleModeChange(value as AutomationMode)}
              className="flex-shrink-0 w-full sm:w-auto"
            />
            
            {/* Active Mode Description */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="truncate">{activeDescription}</span>
            </div>
          </div>

          {/* Right Group: Threshold Badge + Settings */}
          <div className="flex items-center gap-3 justify-between sm:justify-end">
            {/* Confidence Threshold Badge (only for HITL) - Clickable with Popover */}
            {settings.mode === 'hitl' && (
              <Popover open={thresholdOpen} onOpenChange={setThresholdOpen}>
                <PopoverTrigger>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="font-mono text-xs rounded-full h-8 px-3 min-h-[44px] md:min-h-0 md:h-6"
                  >
                    {settings.confidenceThreshold}% threshold
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end" side="bottom">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Confidence Threshold</label>
                        <span className="text-sm font-mono text-muted-foreground">
                          {settings.confidenceThreshold}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Actions below this confidence require approval
                      </p>
                    </div>
                    <Slider
                      value={[settings.confidenceThreshold]}
                      onValueChange={async ([value]) => {
                        try {
                          await updateSettings({ confidenceThreshold: value });
                        } catch (error) {
                          console.error('Failed to update threshold:', error);
                        }
                      }}
                      min={50}
                      max={95}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>50%</span>
                      <span>95%</span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Settings Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="flex-shrink-0 h-10 w-10 md:h-9 md:w-9"
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
