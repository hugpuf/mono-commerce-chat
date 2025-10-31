import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface FullAccountDeletionProps {
  workspaceName: string;
  onDelete: () => Promise<void>;
}

export function FullAccountDeletion({ workspaceName, onDelete }: FullAccountDeletionProps) {
  const [showFirstDialog, setShowFirstDialog] = useState(false);
  const [showFinalDialog, setShowFinalDialog] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [isDeleting, setIsDeleting] = useState(false);

  const isNameMatch = confirmInput === workspaceName;

  const handleFirstConfirm = () => {
    setShowFirstDialog(false);
    setShowFinalDialog(true);
    // Start countdown
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleFinalConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
      setShowFinalDialog(false);
      setConfirmInput('');
      setCountdown(5);
    }
  };

  const resetDialogs = () => {
    setShowFirstDialog(false);
    setShowFinalDialog(false);
    setConfirmInput('');
    setCountdown(5);
  };

  return (
    <>
      <div className="border-2 border-destructive/50 rounded-lg p-6 bg-destructive/5">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete your entire account and all associated data. This action is
              irreversible and will delete:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 mb-4 list-disc list-inside">
              <li>All WhatsApp connections and conversation history</li>
              <li>Product catalog and inventory data</li>
              <li>Payment provider configurations</li>
              <li>Order history and analytics</li>
              <li>User profiles and workspace settings</li>
              <li>All uploaded files and documents</li>
            </ul>
          </div>
        </div>
        <Button
          variant="destructive"
          onClick={() => setShowFirstDialog(true)}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Deleting Account...
            </>
          ) : (
            'Delete Entire Account'
          )}
        </Button>
      </div>

      {/* First confirmation dialog */}
      <AlertDialog open={showFirstDialog} onOpenChange={setShowFirstDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Your Account?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                This will permanently delete all your data. To confirm, please type your workspace
                name:
              </p>
              <div className="space-y-2">
                <Label htmlFor="workspace-name">
                  Workspace name:{' '}
                  <span className="font-mono font-semibold">{workspaceName}</span>
                </Label>
                <Input
                  id="workspace-name"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="Type workspace name"
                  className="font-mono"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={resetDialogs}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFirstConfirm}
              disabled={!isNameMatch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Final confirmation dialog with countdown */}
      <AlertDialog open={showFinalDialog} onOpenChange={setShowFinalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <AlertDialogTitle>Final Warning</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-4">
              <p className="text-base font-semibold">
                This will delete EVERYTHING and cannot be undone.
              </p>
              <p>All your data will be permanently erased from our systems.</p>
              {countdown > 0 && (
                <p className="text-center text-2xl font-bold text-destructive">
                  {countdown}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={resetDialogs}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinalConfirm}
              disabled={countdown > 0 || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Confirm Deletion'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
