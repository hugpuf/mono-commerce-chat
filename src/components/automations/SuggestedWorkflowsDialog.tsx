import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Sparkles, Plus } from 'lucide-react';
import { useAutomations, type AutomationFlow } from '@/contexts/AutomationsContext';
import { useToast } from '@/hooks/use-toast';

interface SuggestedWorkflowsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SuggestedWorkflowsDialog({
  open,
  onOpenChange,
}: SuggestedWorkflowsDialogProps) {
  const { automations, duplicateAutomation } = useAutomations();
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  // Get suggested workflows that aren't already added
  const suggestedWorkflows = automations.filter(a => a.category === 'suggested');
  
  const filteredWorkflows = suggestedWorkflows.filter(workflow =>
    search === '' ||
    workflow.name.toLowerCase().includes(search.toLowerCase()) ||
    workflow.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddWorkflow = (workflow: AutomationFlow) => {
    duplicateAutomation(workflow.id);
    toast({
      title: "Workflow added",
      description: `${workflow.name} has been added to your workflows`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden p-0 flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Suggested Workflows
            </DialogTitle>
            <DialogDescription>
              Browse and add pre-built workflow templates to automate your customer interactions
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search suggested workflows..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Workflow Grid */}
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="grid gap-4">
            {filteredWorkflows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No workflows found matching your search.</p>
              </div>
            ) : (
              filteredWorkflows.map(workflow => (
                <div
                  key={workflow.id}
                  className="border border-border rounded-lg p-4 hover:border-foreground/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-sm">{workflow.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {workflow.mode}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {workflow.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {workflow.triggers.length} trigger{workflow.triggers.length !== 1 ? 's' : ''}
                        </span>
                        <span>•</span>
                        <span>
                          {workflow.actions.length} action{workflow.actions.length !== 1 ? 's' : ''}
                        </span>
                        {workflow.metrics && (
                          <>
                            <span>•</span>
                            <span className="text-primary font-medium">
                              {workflow.metrics.conversionRate}% avg conversion
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleAddWorkflow(workflow)}
                      size="sm"
                      className="flex-shrink-0 gap-2"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
