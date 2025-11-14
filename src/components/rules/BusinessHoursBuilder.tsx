import { useState, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DaySchedule {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

interface BusinessHoursConfig {
  id?: string;
  name: string;
  description: string;
  timezone: string;
  schedule: DaySchedule[];
  holidays: string[];
  out_of_hours_behavior: 'queue' | 'auto_reply' | 'disable';
  enabled: boolean;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

export function BusinessHoursBuilder() {
  const { workspace } = useWorkspace();
  const [config, setConfig] = useState<BusinessHoursConfig>({
    name: 'Default Business Hours',
    description: '',
    timezone: 'America/New_York',
    schedule: DAYS.map((day) => ({
      day,
      enabled: day !== 'Saturday' && day !== 'Sunday',
      start: '09:00',
      end: '17:00',
    })),
    holidays: [],
    out_of_hours_behavior: 'queue',
    enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newHoliday, setNewHoliday] = useState('');

  useEffect(() => {
    if (workspace?.id) {
      loadConfig();
    }
  }, [workspace?.id]);

  const loadConfig = async () => {
    if (!workspace?.id) return;

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('business_hours_config')
        .select('*')
        .eq('workspace_id', workspace.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setConfig(data);
      }
    } catch (error) {
      console.error('Error loading business hours config:', error);
      toast.error('Failed to load business hours configuration');
    } finally {
      setLoading(false);
    }
  };

  const updateSchedule = (dayIndex: number, updates: Partial<DaySchedule>) => {
    const newSchedule = [...config.schedule];
    newSchedule[dayIndex] = { ...newSchedule[dayIndex], ...updates };
    setConfig({ ...config, schedule: newSchedule });
  };

  const addHoliday = () => {
    if (!newHoliday.trim()) return;
    setConfig({ ...config, holidays: [...config.holidays, newHoliday.trim()] });
    setNewHoliday('');
  };

  const removeHoliday = (holiday: string) => {
    setConfig({ ...config, holidays: config.holidays.filter((h) => h !== holiday) });
  };

  const saveConfig = async () => {
    if (!workspace?.id) return;

    setSaving(true);
    try {
      const dataToSave = {
        workspace_id: workspace.id,
        name: config.name,
        description: config.description,
        timezone: config.timezone,
        schedule: config.schedule,
        holidays: config.holidays,
        out_of_hours_behavior: config.out_of_hours_behavior,
        enabled: config.enabled,
      };

      const { error } = await (supabase as any)
        .from('business_hours_config')
        .upsert(dataToSave, { onConflict: 'workspace_id' });

      if (error) throw error;

      toast.success('Business hours configuration saved successfully');
      loadConfig();
    } catch (error) {
      console.error('Error saving business hours config:', error);
      toast.error('Failed to save business hours configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading configuration...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Configure when your AI assistant should be active
        </p>
        <Button onClick={saveConfig} disabled={saving} size="sm">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-2">
              <Input
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                className="text-lg font-semibold"
                placeholder="Configuration name"
              />
              <Textarea
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="Description..."
                className="min-h-[60px]"
              />
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select
              value={config.timezone}
              onValueChange={(value) => setConfig({ ...config, timezone: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">Weekly Schedule</Label>
            {config.schedule.map((day, index) => (
              <div key={day.day} className="flex items-center gap-4">
                <div className="w-28">
                  <Switch
                    checked={day.enabled}
                    onCheckedChange={(checked) => updateSchedule(index, { enabled: checked })}
                    className="mr-2"
                  />
                  <span className={day.enabled ? '' : 'text-muted-foreground'}>{day.day}</span>
                </div>
                <Input
                  type="time"
                  value={day.start}
                  onChange={(e) => updateSchedule(index, { start: e.target.value })}
                  disabled={!day.enabled}
                  className="w-32"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={day.end}
                  onChange={(e) => updateSchedule(index, { end: e.target.value })}
                  disabled={!day.enabled}
                  className="w-32"
                />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">Holidays</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={newHoliday}
                onChange={(e) => setNewHoliday(e.target.value)}
                placeholder="YYYY-MM-DD"
              />
              <Button onClick={addHoliday} size="icon" variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.holidays.map((holiday) => (
                <Badge key={holiday} variant="secondary" className="gap-1">
                  {holiday}
                  <button onClick={() => removeHoliday(holiday)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Out of Hours Behavior</Label>
            <Select
              value={config.out_of_hours_behavior}
              onValueChange={(value: any) =>
                setConfig({ ...config, out_of_hours_behavior: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="queue">Queue Messages for Next Business Day</SelectItem>
                <SelectItem value="auto_reply">Send Auto-Reply Message</SelectItem>
                <SelectItem value="disable">Disable AI Responses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
