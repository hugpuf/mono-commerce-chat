import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday'
};

const HOURS = Array.from({ length: 24 }, (_, i) => 
  `${i.toString().padStart(2, '0')}:00`
);

interface BusinessHours {
  monday?: { enabled?: boolean; open?: string; close?: string };
  tuesday?: { enabled?: boolean; open?: string; close?: string };
  wednesday?: { enabled?: boolean; open?: string; close?: string };
  thursday?: { enabled?: boolean; open?: string; close?: string };
  friday?: { enabled?: boolean; open?: string; close?: string };
  saturday?: { enabled?: boolean; open?: string; close?: string };
  sunday?: { enabled?: boolean; open?: string; close?: string };
  alwaysOpen?: boolean;
  byAppointment?: boolean;
}

interface BusinessHoursPickerProps {
  value: BusinessHours;
  onChange: (value: BusinessHours) => void;
}

export function BusinessHoursPicker({ value = {}, onChange }: BusinessHoursPickerProps) {
  const updateDay = (day: string, field: string, fieldValue: any) => {
    onChange({
      ...value,
      [day]: {
        ...value[day],
        [field]: fieldValue
      }
    });
  };

  const toggleAlwaysOpen = (checked: boolean) => {
    onChange({
      ...value,
      alwaysOpen: checked,
      byAppointment: checked ? false : value.byAppointment
    });
  };

  const toggleByAppointment = (checked: boolean) => {
    onChange({
      ...value,
      byAppointment: checked,
      alwaysOpen: checked ? false : value.alwaysOpen
    });
  };

  const isDisabled = value.alwaysOpen || value.byAppointment;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <Label htmlFor="always-open" className="cursor-pointer">Always Open</Label>
        <Switch
          id="always-open"
          checked={value.alwaysOpen || false}
          onCheckedChange={toggleAlwaysOpen}
        />
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <Label htmlFor="by-appointment" className="cursor-pointer">By Appointment Only</Label>
        <Switch
          id="by-appointment"
          checked={value.byAppointment || false}
          onCheckedChange={toggleByAppointment}
        />
      </div>

      <div className="space-y-3">
        {DAYS.map((day) => {
          const dayData = value[day] || { enabled: false };
          return (
            <div key={day} className="flex items-center gap-4 p-3 border rounded-lg">
              <div className="flex items-center gap-2 w-32">
                <Switch
                  checked={dayData.enabled || false}
                  onCheckedChange={(checked) => updateDay(day, 'enabled', checked)}
                  disabled={isDisabled}
                />
                <Label className="font-normal">{DAY_LABELS[day]}</Label>
              </div>
              
              {dayData.enabled && !isDisabled && (
                <div className="flex items-center gap-2 flex-1">
                  <Select
                    value={dayData.open || '09:00'}
                    onValueChange={(val) => updateDay(day, 'open', val)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((hour) => (
                        <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <span className="text-muted-foreground">to</span>
                  
                  <Select
                    value={dayData.close || '17:00'}
                    onValueChange={(val) => updateDay(day, 'close', val)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((hour) => (
                        <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
