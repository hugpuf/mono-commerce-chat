import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search } from 'lucide-react';
import { useAutomations } from '@/contexts/AutomationsContext';
import AutomationCard from './AutomationCard';

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
  const [activeTab, setActiveTab] = useState<'suggested' | 'custom'>('suggested');

  const filtered = automations.filter(a => {
    const matchesSearch =
      search === '' ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'suggested' ? a.category === 'suggested' : a.category === 'custom';
    return matchesSearch && matchesTab;
  });

  return (
    <div className="px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Workflow Library</h2>
        <Button onClick={onCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      {/* Search & Tabs */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search workflows..."
            className="pl-9"
          />
        </div>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="suggested">Suggested</TabsTrigger>
            <TabsTrigger value="custom">My Workflows</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No workflows found.</p>
            {activeTab === 'custom' && (
              <Button onClick={onCreateNew} variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Create your first workflow
              </Button>
            )}
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
    </div>
  );
}
