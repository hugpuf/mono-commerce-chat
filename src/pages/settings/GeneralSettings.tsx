import { useEffect, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

export default function GeneralSettings() {
  const { workspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    if (workspace) {
      setCompanyName(workspace.company_name || workspace.name || '');
      setLogoUrl(workspace.logo_url || '');
    }
  }, [workspace]);

  const handleSave = async () => {
    if (!workspace?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({
          company_name: companyName,
          logo_url: logoUrl,
        })
        .eq('id', workspace.id);

      if (error) throw error;

      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">General Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your workspace information and branding
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>
            Update your company name and logo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <div className="flex gap-2">
              <Input
                id="logoUrl"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              <Button variant="outline" size="icon">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            {logoUrl && (
              <div className="mt-2">
                <img
                  src={logoUrl}
                  alt="Company logo preview"
                  className="h-16 w-16 rounded-lg object-cover border"
                />
              </div>
            )}
          </div>

          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
