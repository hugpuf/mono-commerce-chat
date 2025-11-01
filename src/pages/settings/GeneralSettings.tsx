import { useEffect, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { LogoUpload } from '@/components/settings/LogoUpload';
import { CategorySelect } from '@/components/settings/CategorySelect';
import { BusinessHoursPicker } from '@/components/settings/BusinessHoursPicker';
import { DataDeletionCard } from '@/components/settings/DataDeletionCard';

export default function GeneralSettings() {
  const { workspace, refetch } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessWebsite, setBusinessWebsite] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessHours, setBusinessHours] = useState({});
  const [whatsappAccount, setWhatsappAccount] = useState<any>(null);

  useEffect(() => {
    if (workspace) {
      setCompanyName(workspace.company_name || workspace.name || '');
      setLogoUrl(workspace.logo_url || '');
      setBusinessDescription(workspace.business_description || '');
      setBusinessCategory(workspace.business_category || '');
      setBusinessEmail(workspace.business_email || '');
      setBusinessWebsite(workspace.business_website || '');
      setBusinessAddress(workspace.business_address || '');
      setBusinessHours(workspace.business_hours || {});
      
      // Fetch WhatsApp account if connected
      fetchWhatsAppAccount();
    }
  }, [workspace]);

  const fetchWhatsAppAccount = async () => {
    if (!workspace?.id) return;
    
    const { data } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('status', 'active')
      .limit(1);
    
    setWhatsappAccount(data?.[0] || null);
  };

  const handleSave = async () => {
    if (!workspace?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({
          company_name: companyName,
          logo_url: logoUrl,
          business_description: businessDescription,
          business_category: businessCategory,
          business_email: businessEmail,
          business_website: businessWebsite,
          business_address: businessAddress,
          business_hours: businessHours,
        })
        .eq('id', workspace.id);

      if (error) throw error;

      await refetch();
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToWhatsApp = async () => {
    if (!workspace?.id || !whatsappAccount) return;

    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-to-whatsapp', {
        body: {
          workspaceId: workspace.id,
          wabaId: whatsappAccount.waba_id,
        }
      });

      if (error) throw error;

      toast.success('Synced to WhatsApp successfully');
      fetchWhatsAppAccount();
    } catch (error) {
      console.error('Error syncing to WhatsApp:', error);
      toast.error('Failed to sync to WhatsApp');
    } finally {
      setSyncing(false);
    }
  };

  const charCount = businessDescription.length;
  const charLimit = 139;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">General Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your business profile and WhatsApp presence
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Identity</CardTitle>
          <CardDescription>
            Your company logo and name appear across the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LogoUpload 
            currentLogoUrl={logoUrl} 
            onUploadComplete={(url) => setLogoUrl(url)}
          />
          
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Tell customers what your business is about
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CategorySelect 
            value={businessCategory}
            onChange={setBusinessCategory}
          />

          <div className="space-y-2">
            <Label htmlFor="description">Business Description</Label>
            <Textarea
              id="description"
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value.slice(0, charLimit))}
              placeholder="What makes your business special?"
              rows={3}
              maxLength={charLimit}
            />
            <p className="text-xs text-muted-foreground text-right">
              {charCount}/{charLimit} characters
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>
            How customers can reach you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Business Email</Label>
            <Input
              id="email"
              type="email"
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
              placeholder="contact@company.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={businessWebsite}
              onChange={(e) => setBusinessWebsite(e.target.value)}
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Physical Address (Optional)</Label>
            <Textarea
              id="address"
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              placeholder="123 Main Street, City, State, ZIP"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Hours</CardTitle>
          <CardDescription>
            When customers can expect to reach you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessHoursPicker 
            value={businessHours}
            onChange={setBusinessHours}
          />
        </CardContent>
      </Card>

      {whatsappAccount && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              WhatsApp Connection
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </Badge>
            </CardTitle>
            <CardDescription>
              Your WhatsApp Business Account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Phone Number</p>
                <p className="font-medium">{whatsappAccount.phone_number}</p>
              </div>
              <div>
                <p className="text-muted-foreground">WABA ID</p>
                <p className="font-mono text-xs">{whatsappAccount.waba_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant="secondary">{whatsappAccount.status}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Display Name</p>
                <p className="font-medium">{whatsappAccount.display_name || '—'}</p>
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={handleSyncToWhatsApp}
              disabled={syncing}
              className="w-full"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync to WhatsApp
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Button onClick={handleSave} disabled={loading} size="lg">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Saving...
          </>
        ) : (
          'Save Changes'
        )}
      </Button>

      {/* Data & Privacy Section */}
      <DataDeletionCard 
        workspaceId={workspace?.id || ''}
        workspaceName={workspace?.name || workspace?.company_name || 'Your Workspace'}
      />
    </div>
  );
}
