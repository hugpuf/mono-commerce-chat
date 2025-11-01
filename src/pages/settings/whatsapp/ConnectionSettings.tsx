import { useEffect, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppAccount {
  id: string;
  waba_id: string;
  phone_number_id: string;
  phone_number: string;
  display_name: string | null;
  business_name: string | null;
  status: string;
  webhook_status: string | null;
  updated_at: string;
}

interface AuditLog {
  id: string;
  action: string;
  created_at: string;
  target_type: string;
}

export default function ConnectionSettings() {
  const { workspace } = useWorkspace();
  const [account, setAccount] = useState<WhatsAppAccount | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workspace?.id) {
      fetchConnectionData();
    }
  }, [workspace?.id]);

  const fetchConnectionData = async () => {
    if (!workspace?.id) return;

    try {
      // Fetch WhatsApp account
      const { data: accountDataArr, error: accountError } = await supabase
        .from('whatsapp_accounts')
        .select('*')
        .eq('workspace_id', workspace.id)
        .limit(1);
      
      const accountData = accountDataArr?.[0] || null;

      if (accountError) throw accountError;
      setAccount(accountData);

      // Fetch audit logs
      const { data: logsData, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('target_type', 'whatsapp_account')
        .order('created_at', { ascending: false })
        .limit(20);

      if (logsError) throw logsError;
      setLogs(logsData || []);
    } catch (error) {
      console.error('Error fetching connection data:', error);
      toast.error('Failed to load connection data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'default',
      pending: 'secondary',
      error: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleReconnect = () => {
    window.location.href = '/setup/add-channel';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">WhatsApp Connection</h1>
        <p className="text-muted-foreground mt-1">
          Manage your WhatsApp Business account connection
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {account ? getStatusIcon(account.status) : <XCircle className="h-5 w-5 text-red-500" />}
              <div>
                <CardTitle>Connection Status</CardTitle>
                <CardDescription>
                  {account ? `Last updated ${new Date(account.updated_at).toLocaleDateString()}` : 'Not connected'}
                </CardDescription>
              </div>
            </div>
            {account && getStatusBadge(account.status)}
          </div>
        </CardHeader>
        <CardContent>
          {account ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Your WhatsApp Business account is connected and active.
              </p>
              <Button variant="outline" onClick={handleReconnect}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reconnect
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                No WhatsApp account connected. Connect your account to start messaging customers.
              </p>
              <Button onClick={handleReconnect}>
                Connect WhatsApp
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection Details */}
      {account && (
        <Card>
          <CardHeader>
            <CardTitle>Connection Details</CardTitle>
            <CardDescription>Read-only account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">WABA ID</p>
                <p className="text-sm font-mono mt-1">{account.waba_id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone Number ID</p>
                <p className="text-sm font-mono mt-1">{account.phone_number_id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                <p className="text-sm mt-1">{account.phone_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Display Name</p>
                <p className="text-sm mt-1">{account.display_name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Business Name</p>
                <p className="text-sm mt-1">{account.business_name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Webhook Status</p>
                <p className="text-sm mt-1">{getStatusBadge(account.webhook_status || 'pending')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Last 20 actions on this account</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="flex-1">{log.action}</span>
                  <span className="text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No activity yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
