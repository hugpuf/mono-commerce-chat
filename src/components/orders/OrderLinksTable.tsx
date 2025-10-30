import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreVertical,
  Copy,
  Send,
  XCircle,
  FileText,
  Clock,
  ExternalLink,
} from "lucide-react";

interface OrderLink {
  id: string;
  customer: string;
  amount: string;
  status: "draft" | "sent" | "opened" | "paid" | "expired";
  channel: string;
  provider: string;
  template: string;
  created: string;
  expires: string;
  opens: number;
  clicks: number;
}

const mockLinks: OrderLink[] = [
  {
    id: "LNK-001",
    customer: "Sarah Chen",
    amount: "$367.82",
    status: "paid",
    channel: "WhatsApp",
    provider: "Stripe",
    template: "Standard Invoice",
    created: "2h ago",
    expires: "in 5d",
    opens: 2,
    clicks: 1,
  },
  {
    id: "LNK-002",
    customer: "John Smith",
    amount: "$1,245.00",
    status: "opened",
    channel: "WhatsApp",
    provider: "Stripe",
    template: "Minimal B&W",
    created: "5h ago",
    expires: "in 4d",
    opens: 1,
    clicks: 0,
  },
  {
    id: "LNK-003",
    customer: "Maria Garcia",
    amount: "$89.50",
    status: "sent",
    channel: "SMS",
    provider: "Stripe",
    template: "Standard Invoice",
    created: "1d ago",
    expires: "in 3d",
    opens: 0,
    clicks: 0,
  },
  {
    id: "LNK-004",
    customer: "David Lee",
    amount: "$2,500.00",
    status: "draft",
    channel: "WhatsApp",
    provider: "Stripe",
    template: "Standard Invoice",
    created: "2d ago",
    expires: "in 2d",
    opens: 0,
    clicks: 0,
  },
];

const statusConfig = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  sent: { label: "Sent", className: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  opened: { label: "Opened", className: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  paid: { label: "Paid", className: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" },
  expired: { label: "Expired", className: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

interface OrderLinksTableProps {
  onSelectOrder: (id: string) => void;
}

export function OrderLinksTable({ onSelectOrder }: OrderLinksTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Order Links</h2>
          <Button size="sm" variant="outline">
            Create Link
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search: status:opened customer:smith provider:stripe"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs font-mono"
          />
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        <div className="min-w-full">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-background border-b border-border">
              <tr>
                <th className="text-left font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Link ID
                </th>
                <th className="text-left font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Customer
                </th>
                <th className="text-right font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Amount
                </th>
                <th className="text-left font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Status
                </th>
                <th className="text-left font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Channel
                </th>
                <th className="text-left font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Provider
                </th>
                <th className="text-left font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Template
                </th>
                <th className="text-left font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Created
                </th>
                <th className="text-left font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Expires
                </th>
                <th className="text-center font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Opens/Clicks
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {mockLinks.map((link) => (
                <tr
                  key={link.id}
                  className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onSelectOrder(link.id)}
                >
                  <td className="p-3">
                    <span className="font-mono font-medium">{link.id}</span>
                  </td>
                  <td className="p-3">{link.customer}</td>
                  <td className="p-3 text-right font-mono">{link.amount}</td>
                  <td className="p-3">
                    <Badge variant="secondary" className={statusConfig[link.status].className}>
                      {statusConfig[link.status].label}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{link.channel}</td>
                  <td className="p-3 text-muted-foreground">{link.provider}</td>
                  <td className="p-3 text-muted-foreground">{link.template}</td>
                  <td className="p-3 text-muted-foreground">{link.created}</td>
                  <td className="p-3 text-muted-foreground">{link.expires}</td>
                  <td className="p-3 text-center font-mono text-muted-foreground">
                    {link.opens}/{link.clicks}
                  </td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Copy className="h-3 w-3 mr-2" />
                          Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Send className="h-3 w-3 mr-2" />
                          Resend via WhatsApp
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="h-3 w-3 mr-2" />
                          Preview Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Clock className="h-3 w-3 mr-2" />
                          View Timeline
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ExternalLink className="h-3 w-3 mr-2" />
                          Open Link
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <XCircle className="h-3 w-3 mr-2" />
                          Revoke
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-3 text-xs text-muted-foreground">
        {mockLinks.length} links
      </div>
    </div>
  );
}
