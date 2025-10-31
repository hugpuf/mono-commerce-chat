import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';

export default function DeletionStatus() {
  const [searchParams] = useSearchParams();
  const deletionId = searchParams.get('id');
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      if (!deletionId) {
        setError('No deletion ID provided');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('data_deletion_requests')
          .select('*')
          .eq('id', deletionId)
          .single();

        if (fetchError) throw fetchError;
        setStatus(data);
      } catch (err) {
        console.error('Error fetching deletion status:', err);
        setError('Failed to load deletion status');
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, [deletionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error || 'Deletion request not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (status.status) {
      case 'completed':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'failed':
        return <XCircle className="h-8 w-8 text-destructive" />;
      case 'processing':
        return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
      default:
        return <Clock className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'completed':
        return 'Deletion Completed';
      case 'failed':
        return 'Deletion Failed';
      case 'processing':
        return 'Deletion In Progress';
      default:
        return 'Deletion Pending';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            {getStatusIcon()}
            <CardTitle>{getStatusText()}</CardTitle>
          </div>
          <CardDescription>
            Data deletion request status for confirmation code: {status.confirmation_code}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Request Type:</span>
              <span className="font-medium capitalize">{status.deletion_type}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium capitalize">{status.status}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Requested At:</span>
              <span className="font-medium">
                {new Date(status.requested_at).toLocaleString()}
              </span>
            </div>
            {status.completed_at && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed At:</span>
                <span className="font-medium">
                  {new Date(status.completed_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {status.deletion_scope && status.deletion_scope.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Data Categories Deleted:</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                {status.deletion_scope.map((scope: string) => (
                  <li key={scope} className="capitalize">
                    {scope}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status.error_message && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <p className="text-sm text-destructive">
                <strong>Error:</strong> {status.error_message}
              </p>
            </div>
          )}

          {status.status === 'completed' && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-md p-3">
              <p className="text-sm text-green-700 dark:text-green-400">
                Your data has been permanently deleted from our systems. This action cannot be
                reversed.
              </p>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Confirmation Code: <span className="font-mono">{status.confirmation_code}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Please save this code for your records.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
