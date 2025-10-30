import { useState } from "react";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { AnalyticsDrilldown } from "@/components/analytics/AnalyticsDrilldown";
import { WidgetCard } from "@/components/analytics/WidgetCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { useToast } from "@/hooks/use-toast";

// Mock data generators
const generateMessageVolumeData = () => {
  const data = [];
  for (let i = 0; i < 7; i++) {
    data.push({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sent: Math.floor(Math.random() * 500) + 300,
      delivered: Math.floor(Math.random() * 450) + 280,
      read: Math.floor(Math.random() * 400) + 250,
      replied: Math.floor(Math.random() * 150) + 50,
    });
  }
  return data;
};

const generateSentimentData = () => [
  { sentiment: 'Very Positive', count: 45, color: 'hsl(var(--foreground))' },
  { sentiment: 'Positive', count: 120, color: 'hsl(var(--foreground) / 0.8)' },
  { sentiment: 'Neutral', count: 85, color: 'hsl(var(--foreground) / 0.6)' },
  { sentiment: 'Negative', count: 30, color: 'hsl(var(--foreground) / 0.4)' },
  { sentiment: 'Very Negative', count: 12, color: 'hsl(var(--foreground) / 0.2)' },
];

const generateConversionData = () => [
  { stage: 'Conversations', count: 1200 },
  { stage: 'With Link', count: 850 },
  { stage: 'Link Opened', count: 520 },
  { stage: 'Orders', count: 234 },
];

const generateOrdersByStatus = () => [
  { status: 'Paid', count: 234, color: 'hsl(var(--foreground))' },
  { status: 'Shipped', count: 189, color: 'hsl(var(--foreground) / 0.8)' },
  { status: 'Delivered', count: 156, color: 'hsl(var(--foreground) / 0.6)' },
  { status: 'Refunded', count: 12, color: 'hsl(var(--foreground) / 0.4)' },
];

const generateTemplatePerformance = () => [
  { template: 'Order Confirmation', sent: 1250, delivered: 1248, read: 1180, replied: 45, conversion: 18.7, revenue: 45680 },
  { template: 'Product Catalog', sent: 890, delivered: 885, read: 720, replied: 89, conversion: 12.4, revenue: 28450 },
  { template: 'Shipping Update', sent: 654, delivered: 652, read: 640, replied: 12, conversion: 0, revenue: 0 },
  { template: 'Payment Reminder', sent: 432, delivered: 428, read: 380, replied: 156, conversion: 24.1, revenue: 18920 },
];

const generateHeatmapData = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const data = [];
  
  for (const day of days) {
    for (const hour of hours) {
      data.push({
        day,
        hour: `${hour}:00`,
        value: Math.floor(Math.random() * 100),
      });
    }
  }
  return data;
};

const generateSparkline = () => {
  return Array.from({ length: 7 }, () => ({ value: Math.random() * 100 }));
};

export default function Analytics() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("7d");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState("whatsapp");
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownData, setDrilldownData] = useState<any>(null);

  const handleExport = () => {
    toast({ title: "Export started", description: "Your analytics data is being prepared for download." });
  };

  const handleOpenSettings = () => {
    toast({ title: "Settings", description: "Widget configuration coming soon." });
  };

  const handleDrilldown = (title: string, description: string, records: any[], columns: any[]) => {
    setDrilldownData({ title, description, records, columns });
    setDrilldownOpen(true);
  };

  const messageVolumeData = generateMessageVolumeData();
  const sentimentData = generateSentimentData();
  const conversionData = generateConversionData();
  const ordersByStatus = generateOrdersByStatus();
  const templatePerformance = generateTemplatePerformance();

  return (
    <div className="flex flex-col h-full bg-background">
      <AnalyticsFilters
        dateRange={dateRange}
        setDateRange={setDateRange}
        compareEnabled={compareEnabled}
        setCompareEnabled={setCompareEnabled}
        selectedChannel={selectedChannel}
        setSelectedChannel={setSelectedChannel}
        onExport={handleExport}
        onOpenSettings={handleOpenSettings}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Key Metrics */}
          <WidgetCard
            title="Total Messages"
            value="12,458"
            change={12.5}
            sparklineData={generateSparkline()}
            description="Total messages sent across all channels"
            onDownload={() => toast({ title: "Downloaded" })}
          />
          <WidgetCard
            title="Conversion Rate"
            value="19.5%"
            change={-2.3}
            sparklineData={generateSparkline()}
            description="Messages to orders conversion rate"
            onDownload={() => toast({ title: "Downloaded" })}
          />
          <WidgetCard
            title="Total Revenue"
            value="$93,050"
            change={8.7}
            sparklineData={generateSparkline()}
            description="Total revenue from orders"
            onDownload={() => toast({ title: "Downloaded" })}
          />
          <WidgetCard
            title="Avg Order Value"
            value="$397"
            change={5.2}
            sparklineData={generateSparkline()}
            description="Average value per order"
            onDownload={() => toast({ title: "Downloaded" })}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* 1. Message Volume Over Time */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Message Volume Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={messageVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }} 
                  />
                  <Legend />
                  <Area type="monotone" dataKey="sent" stackId="1" stroke="hsl(var(--foreground))" fill="hsl(var(--foreground) / 0.8)" />
                  <Area type="monotone" dataKey="delivered" stackId="1" stroke="hsl(var(--foreground))" fill="hsl(var(--foreground) / 0.6)" />
                  <Area type="monotone" dataKey="read" stackId="1" stroke="hsl(var(--foreground))" fill="hsl(var(--foreground) / 0.4)" />
                  <Area type="monotone" dataKey="replied" stackId="1" stroke="hsl(var(--foreground))" fill="hsl(var(--foreground) / 0.2)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 2. Customer Sentiment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Customer Sentiment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-2xl font-bold">7.8/10</div>
                  <div className="text-xs text-muted-foreground">Average score</div>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span>↑ 0.3</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sentimentData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="sentiment" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }} 
                  />
                  <Bar dataKey="count">
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 3. Customer Satisfaction (CSAT) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Customer Satisfaction (CSAT)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center mb-6">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="hsl(var(--border))"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="hsl(var(--foreground))"
                      strokeWidth="8"
                      strokeDasharray={`${4.2 * 88} ${2.51 * 100}`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-3xl font-bold">4.2</div>
                    <div className="text-xs text-muted-foreground">out of 5</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1 text-xs">
                <span>↑ 0.2</span>
                <span className="text-muted-foreground">vs previous period</span>
              </div>
            </CardContent>
          </Card>

          {/* 4. Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={conversionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }} 
                  />
                  <Bar dataKey="count" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 5. Orders by Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Orders by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                  >
                    {ordersByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {ordersByStatus.map((item) => (
                  <div key={item.status} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                    <span className="text-xs">{item.status}: {item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 6. Template Performance */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Template Performance (WhatsApp)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead className="text-right">Read</TableHead>
                    <TableHead className="text-right">Replied</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templatePerformance.map((row) => (
                    <TableRow 
                      key={row.template}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleDrilldown(
                        row.template,
                        'Messages sent using this template',
                        [
                          { customer: 'John Smith', sent: '2h ago', status: 'Read' },
                          { customer: 'Jane Doe', sent: '3h ago', status: 'Delivered' },
                        ],
                        [
                          { key: 'customer', label: 'Customer' },
                          { key: 'sent', label: 'Sent' },
                          { key: 'status', label: 'Status' },
                        ]
                      )}
                    >
                      <TableCell className="font-medium">{row.template}</TableCell>
                      <TableCell className="text-right">{row.sent.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.delivered.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.read.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.replied.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {row.conversion > 0 ? (
                          <Badge variant="secondary">{row.conversion}%</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.revenue > 0 ? `$${row.revenue.toLocaleString()}` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 7. Response Time */}
          <WidgetCard
            title="Response Time"
            value="2.4 min"
            change={-15.3}
            sparklineData={generateSparkline()}
            description="Median time to first response"
            onDownload={() => toast({ title: "Downloaded" })}
            className="lg:col-span-1"
          />

          {/* 8. SLA Compliance */}
          <WidgetCard
            title="SLA Compliance"
            value="94.2%"
            change={3.1}
            sparklineData={generateSparkline()}
            description="Percentage of responses within SLA"
            onDownload={() => toast({ title: "Downloaded" })}
            className="lg:col-span-1"
          />

          {/* 9. Contact Growth */}
          <WidgetCard
            title="New Contacts"
            value="847"
            change={18.6}
            sparklineData={generateSparkline()}
            description="Net new opt-ins this period"
            onDownload={() => toast({ title: "Downloaded" })}
            className="lg:col-span-1"
          />

          {/* 10. Opt-out Rate */}
          <WidgetCard
            title="Opt-out Rate"
            value="1.2%"
            change={-0.3}
            sparklineData={generateSparkline()}
            description="Contact opt-out rate"
            onDownload={() => toast({ title: "Downloaded" })}
            className="lg:col-span-1"
          />
        </div>
      </div>

      <AnalyticsDrilldown
        isOpen={drilldownOpen}
        onClose={() => setDrilldownOpen(false)}
        data={drilldownData}
      />
    </div>
  );
}
