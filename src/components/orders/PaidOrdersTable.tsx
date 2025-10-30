import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreVertical,
  FileText,
  Printer,
  Package,
  Truck,
  Send,
  Download,
} from "lucide-react";

interface PaidOrder {
  id: string;
  orderNumber: string;
  customer: { name: string; phone: string };
  itemCount: number;
  total: string;
  paidAt: string;
  shipTo: { city: string; country: string };
  shippingMethod: string;
  hasInvoice: boolean;
  fulfillment: "unfulfilled" | "in_progress";
  tracking: string | null;
  slaDue: string | null;
  isOverdue: boolean;
  sourceLink: string;
}

const mockOrders: PaidOrder[] = [
  {
    id: "ORD-001",
    orderNumber: "#2024-142",
    customer: { name: "Sarah Chen", phone: "+1 555-0123" },
    itemCount: 3,
    total: "$367.82",
    paidAt: "2h ago",
    shipTo: { city: "San Francisco", country: "US" },
    shippingMethod: "Express",
    hasInvoice: true,
    fulfillment: "unfulfilled",
    tracking: null,
    slaDue: "in 4h",
    isOverdue: false,
    sourceLink: "LNK-001",
  },
  {
    id: "ORD-002",
    orderNumber: "#2024-139",
    customer: { name: "Michael Wong", phone: "+1 555-0456" },
    itemCount: 1,
    total: "$125.00",
    paidAt: "6h ago",
    shipTo: { city: "New York", country: "US" },
    shippingMethod: "Standard",
    hasInvoice: true,
    fulfillment: "in_progress",
    tracking: null,
    slaDue: "overdue",
    isOverdue: true,
    sourceLink: "LNK-005",
  },
  {
    id: "ORD-003",
    orderNumber: "#2024-137",
    customer: { name: "Emma Wilson", phone: "+44 20 7123 4567" },
    itemCount: 5,
    total: "£890.50",
    paidAt: "1d ago",
    shipTo: { city: "London", country: "GB" },
    shippingMethod: "Express",
    hasInvoice: true,
    fulfillment: "unfulfilled",
    tracking: null,
    slaDue: "in 1d",
    isOverdue: false,
    sourceLink: "LNK-012",
  },
];

interface PaidOrdersTableProps {
  onSelectOrder: (id: string) => void;
}

export function PaidOrdersTable({ onSelectOrder }: PaidOrdersTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const toggleOrder = (orderId: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleAll = () => {
    setSelectedOrders((prev) =>
      prev.length === mockOrders.length ? [] : mockOrders.map((o) => o.id)
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Paid & To Dispatch</h2>
          {selectedOrders.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {selectedOrders.length} selected
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    Bulk Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Printer className="h-3 w-3 mr-2" />
                    Print Invoices
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <FileText className="h-3 w-3 mr-2" />
                    Print Packing Slips
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Package className="h-3 w-3 mr-2" />
                    Create Labels
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Truck className="h-3 w-3 mr-2" />
                    Mark Shipped
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="h-3 w-3 mr-2" />
                    Export CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search: status:unfulfilled paid:today city:sydney has:invoice"
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
                <th className="p-3 w-10">
                  <Checkbox
                    checked={selectedOrders.length === mockOrders.length}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="text-left font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Order #
                </th>
                <th className="text-left font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Customer
                </th>
                <th className="text-center font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Items
                </th>
                <th className="text-right font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Total
                </th>
                <th className="text-left font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Paid At
                </th>
                <th className="text-left font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Ship To
                </th>
                <th className="text-left font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Shipping Method
                </th>
                <th className="text-left font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Invoice
                </th>
                <th className="text-left font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Fulfillment
                </th>
                <th className="text-left font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Tracking
                </th>
                <th className="text-left font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  SLA Due
                </th>
                <th className="text-left font-semibold text-muted-foreground p-3 whitespace-nowrap">
                  Source
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {mockOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onSelectOrder(order.id)}
                >
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedOrders.includes(order.id)}
                      onCheckedChange={() => toggleOrder(order.id)}
                    />
                  </td>
                  <td className="p-3">
                    <span className="font-mono font-medium">{order.orderNumber}</span>
                  </td>
                  <td className="p-3">
                    <div>
                      <div className="font-medium">{order.customer.name}</div>
                      <div className="text-muted-foreground font-mono text-[10px]">
                        {order.customer.phone}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-center font-mono">{order.itemCount}</td>
                  <td className="p-3 text-right font-mono font-medium">{order.total}</td>
                  <td className="p-3 text-muted-foreground">{order.paidAt}</td>
                  <td className="p-3">
                    <div className="text-muted-foreground">
                      {order.shipTo.city}, {order.shipTo.country}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{order.shippingMethod}</td>
                  <td className="p-3">
                    {order.hasInvoice ? (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        <span className="text-[10px]">PDF</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge
                      variant="secondary"
                      className={
                        order.fulfillment === "unfulfilled"
                          ? "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      }
                    >
                      {order.fulfillment === "unfulfilled" ? "Unfulfilled" : "In Progress"}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground font-mono text-[10px]">
                    {order.tracking || "—"}
                  </td>
                  <td className="p-3">
                    {order.slaDue && (
                      <Badge
                        variant="secondary"
                        className={
                          order.isOverdue
                            ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {order.slaDue}
                      </Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="font-mono text-muted-foreground text-[10px]">
                      {order.sourceLink}
                    </span>
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
                          <FileText className="h-3 w-3 mr-2" />
                          Download Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Send className="h-3 w-3 mr-2" />
                          Send via WhatsApp
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Printer className="h-3 w-3 mr-2" />
                          Print Packing Slip
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Package className="h-3 w-3 mr-2" />
                          Create Shipping Label
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Package className="h-3 w-3 mr-2" />
                          Mark Packed
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Truck className="h-3 w-3 mr-2" />
                          Mark Shipped
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
        {mockOrders.length} orders to dispatch
      </div>
    </div>
  );
}
