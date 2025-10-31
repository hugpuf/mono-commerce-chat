import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SelectiveDeletionSection } from './SelectiveDeletionSection';
import { FullAccountDeletion } from './FullAccountDeletion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface DataDeletionCardProps {
  workspaceId: string;
  workspaceName: string;
}

export function DataDeletionCard({ workspaceId, workspaceName }: DataDeletionCardProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSelectiveDeletion = async (scope: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Not authenticated',
          description: 'Please log in to delete data',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('delete-workspace-data', {
        body: {
          workspaceId,
          deletionType: 'selective',
          deletionScope: [scope],
        },
      });

      if (error) throw error;

      toast({
        title: 'Data deleted',
        description: `Successfully deleted ${scope} data`,
      });

      // Refresh the page to reflect changes
      window.location.reload();
    } catch (error) {
      console.error('Error deleting data:', error);
      toast({
        title: 'Deletion failed',
        description: error.message || 'Failed to delete data',
        variant: 'destructive',
      });
    }
  };

  const handleFullDeletion = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Not authenticated',
          description: 'Please log in to delete your account',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('delete-workspace-data', {
        body: {
          workspaceId,
          deletionType: 'full',
          deletionScope: ['all'],
        },
      });

      if (error) throw error;

      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted',
      });

      // Log out and redirect to home
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Deletion failed',
        description: error.message || 'Failed to delete account',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data & Privacy</CardTitle>
        <CardDescription>
          Manage your data and privacy settings. Deletion actions are permanent and cannot be
          undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Selective Data Deletion</h3>
          <p className="text-sm text-muted-foreground">
            Delete specific categories of data while keeping the rest of your account intact.
          </p>

          <SelectiveDeletionSection
            title="WhatsApp Connection Data"
            description="Remove all WhatsApp connections and conversation history"
            warningText="This will disconnect your WhatsApp Business Account and delete all conversation history."
            scopeKey="whatsapp"
            onDelete={handleSelectiveDeletion}
          />

          <SelectiveDeletionSection
            title="Product Catalog Data"
            description="Remove all products and catalog connections"
            warningText="This will remove all products and catalog connections. Orders referencing these products will retain product snapshots."
            scopeKey="catalog"
            onDelete={handleSelectiveDeletion}
          />

          <SelectiveDeletionSection
            title="Payment Provider Data"
            description="Remove payment provider configurations"
            warningText="This will disconnect payment providers. Past transaction records will be retained."
            scopeKey="payment"
            onDelete={handleSelectiveDeletion}
          />

          <SelectiveDeletionSection
            title="Order History & Analytics"
            description="Remove order history and analytics data"
            warningText="This will permanently delete order history and analytics. This action cannot be undone."
            scopeKey="orders"
            onDelete={handleSelectiveDeletion}
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Full Account Deletion</h3>
          <p className="text-sm text-muted-foreground">
            Permanently delete your entire account and all associated data.
          </p>
          <FullAccountDeletion workspaceName={workspaceName} onDelete={handleFullDeletion} />
        </div>
      </CardContent>
    </Card>
  );
}
