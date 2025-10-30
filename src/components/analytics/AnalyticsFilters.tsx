import { Calendar, Filter, Download, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface AnalyticsFiltersProps {
  dateRange: string;
  setDateRange: (value: string) => void;
  compareEnabled: boolean;
  setCompareEnabled: (value: boolean) => void;
  selectedChannel: string;
  setSelectedChannel: (value: string) => void;
  onExport: () => void;
  onOpenSettings: () => void;
}

export function AnalyticsFilters({
  dateRange,
  setDateRange,
  compareEnabled,
  setCompareEnabled,
  selectedChannel,
  setSelectedChannel,
  onExport,
  onOpenSettings,
}: AnalyticsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 border-b bg-background">
      {/* Date Range */}
      <Select value={dateRange} onValueChange={setDateRange}>
        <SelectTrigger className="w-[160px]">
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>

      {/* Compare Toggle */}
      <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
        <Switch
          id="compare"
          checked={compareEnabled}
          onCheckedChange={setCompareEnabled}
        />
        <Label htmlFor="compare" className="text-sm cursor-pointer">
          Compare to previous
        </Label>
      </div>

      {/* Channel Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Channel</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Agent/Team</Label>
              <Select defaultValue="all">
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  <SelectItem value="team1">Team 1</SelectItem>
                  <SelectItem value="team2">Team 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Customer Segment</Label>
              <Select defaultValue="all">
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="returning">Returning</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenSettings}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
