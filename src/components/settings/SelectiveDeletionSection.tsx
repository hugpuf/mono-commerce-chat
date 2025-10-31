import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Trash2, Loader2 } from 'lucide-react';
import { DeletionConfirmDialog } from './DeletionConfirmDialog';

interface SelectiveDeletionSectionProps {
  title: string;
  description: string;
  warningText: string;
  scopeKey: string;
  onDelete: (scope: string) => Promise<void>;
}

export function SelectiveDeletionSection({
  title,
  description,
  warningText,
  scopeKey,
  onDelete,
}: SelectiveDeletionSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(scopeKey);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="border rounded-lg p-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div className="flex-1 text-left">
              <h4 className="font-medium">{title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 pt-4 border-t">
            <div className="space-y-4">
              <div className="bg-muted/50 border border-warning/20 rounded-md p-3">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Warning:</strong> {warningText}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowConfirm(true)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete {title}
                  </>
                )}
              </Button>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <DeletionConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={handleDelete}
        title={`Delete ${title}?`}
        description={`${warningText} This action cannot be undone.`}
      />
    </>
  );
}
