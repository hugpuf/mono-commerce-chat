import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Sparkles } from 'lucide-react';
import { useAutomations } from '@/contexts/AutomationsContext';
import AutomationCard from './AutomationCard';
import SuggestedWorkflowsDialog from './SuggestedWorkflowsDialog';

interface AutomationLibraryProps {
  onCreateNew: () => void;
  onEdit: (id: string) => void;
  onViewHistory: (id: string) => void;
}

export default function AutomationLibrary({
  onCreateNew,
  onEdit,
  onViewHistory,
}: AutomationLibraryProps) {
  const { automations, updateAutomation, deleteAutomation, duplicateAutomation } = useAutomations();
  const [search, setSearch] = useState('');
  const [suggestedDialogOpen, setSuggestedDialogOpen] = useState(false);

  // Only show custom workflows (user's workflows)
  const filtered = automations.filter(a => {
    const matchesSearch =
      search === '' ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && a.category === 'custom';
  });

  return (
    <div className="px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Workflows</h2>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setSuggestedDialogOpen(true)} 
            variant="outline" 
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Browse Suggested
          </Button>
          <Button onClick={onCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Workflow
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search workflows..."
          className="pl-9"
        />
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-2">No workflows yet.</p>
            <p className="text-sm mb-4">Get started by creating a custom workflow or browse our suggested templates</p>
            <div className="flex items-center justify-center gap-2">
              <Button onClick={() => setSuggestedDialogOpen(true)} variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Browse Suggested
              </Button>
              <Button onClick={onCreateNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Workflow
              </Button>
            </div>
          </div>
        ) : (
          filtered.map(automation => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              onToggle={enabled => updateAutomation(automation.id, { enabled })}
              onEdit={() => onEdit(automation.id)}
              onDuplicate={() => duplicateAutomation(automation.id)}
              onDelete={() => deleteAutomation(automation.id)}
              onViewHistory={() => onViewHistory(automation.id)}
            />
          ))
        )}
      </div>

      {/* Suggested Workflows Dialog */}
      <SuggestedWorkflowsDialog
        open={suggestedDialogOpen}
        onOpenChange={setSuggestedDialogOpen}
      />
    </div>
  );
}
