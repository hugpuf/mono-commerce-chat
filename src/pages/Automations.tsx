import { useState } from 'react';
import { AutomationsProvider } from '@/contexts/AutomationsContext';
import GlobalControls from '@/components/automations/GlobalControls';
import AutomationLibrary from '@/components/automations/AutomationLibrary';
import FlowBuilder from '@/components/automations/FlowBuilder';
import RunHistoryDrawer from '@/components/automations/RunHistoryDrawer';
import PreviewDialog from '@/components/automations/PreviewDialog';
import { useAutomations } from '@/contexts/AutomationsContext';

function AutomationsContent() {
  const { addAutomation, updateAutomation, automations } = useAutomations();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedAutomationId, setSelectedAutomationId] = useState<string | null>(null);

  const handleCreateNew = () => {
    setSelectedAutomationId(null);
    setBuilderOpen(true);
  };

  const handleEdit = (id: string) => {
    setSelectedAutomationId(id);
    setBuilderOpen(true);
  };

  const handleViewHistory = (id: string) => {
    setSelectedAutomationId(id);
    setHistoryOpen(true);
  };

  const handleSave = (automation: any) => {
    if (selectedAutomationId) {
      updateAutomation(selectedAutomationId, automation);
    } else {
      addAutomation(automation);
    }
  };

  const selectedAutomation = selectedAutomationId
    ? automations.find(a => a.id === selectedAutomationId)
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Above the line: Global Controls */}
      <GlobalControls onPreview={() => setPreviewOpen(true)} />

      {/* Below the line: Automation Library */}
      <AutomationLibrary
        onCreateNew={handleCreateNew}
        onEdit={handleEdit}
        onViewHistory={handleViewHistory}
      />

      {/* Dialogs & Drawers */}
      <FlowBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        automation={selectedAutomation}
        onSave={handleSave}
      />
      <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} />
      <RunHistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        automationId={selectedAutomationId || ''}
        automationName={selectedAutomation?.name || ''}
      />
    </div>
  );
}

export default function Automations() {
  return (
    <AutomationsProvider>
      <AutomationsContent />
    </AutomationsProvider>
  );
}
