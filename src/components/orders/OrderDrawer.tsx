import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Download, Send, FileText, Package, MapPin, MessageSquare } from "lucide-react";

interface OrderDrawerProps {
  orderId: string;
  orderType: "link" | "paid";
  onClose: () => void;
}

export function OrderDrawer({ orderId, orderType, onClose }: OrderDrawerProps) {
  return (
    <div className="w-[480px] border-l border-border bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">{orderType === "link" ? "Order Link" : "Order"} Details</h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{orderId}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-border h-auto p-0 bg-transparent">
            <TabsTrigger
              value="timeline"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent"
            >
              Timeline
            </TabsTrigger>
            <TabsTrigger
              value="items"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent"
            >
              Items
            </TabsTrigger>
            <TabsTrigger
              value="customer"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent"
            >
              Customer
            </TabsTrigger>
            <TabsTrigger
              value="invoice"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent"
            >
              Invoice
            </TabsTrigger>
            {orderType === "paid" && (
              <TabsTrigger
                value="shipping"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent"
              >
                Shipping
              </TabsTrigger>
            )}
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="p-4 space-y-4">
            <div className="space-y-4">
              {[
                { time: "2h ago", event: "Payment received", status: "Paid", amount: "$367.82" },
                { time: "2h ago", event: "Link opened", status: "Opened" },
                { time: "3h ago", event: "Link sent via WhatsApp", status: "Sent" },
                { time: "3h ago", event: "Link created", status: "Created" },
              ].map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground mt-2 flex-shrink-0" />
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{item.event}</span>
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {item.status}
                      </Badge>
                      {item.amount && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {item.amount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Items Tab */}
          <TabsContent value="items" className="p-4">
            <div className="space-y-3">
              {[
                { sku: "WDG-001", name: "Premium Widget", qty: 2, price: "$125.00", total: "$250.00" },
                { sku: "SVC-100", name: "Standard Service", qty: 1, price: "$89.00", total: "$89.00" },
                { sku: "ACC-025", name: "Accessory Pack", qty: 1, price: "$28.82", total: "$28.82" },
              ].map((item, i) => (
                <div key={i} className="border border-border rounded p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{item.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-medium">{item.total}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Qty: {item.qty}</span>
                    <span className="font-mono">{item.price} each</span>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">$339.00</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax (8.5%)</span>
                <span className="font-mono">$28.82</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="font-mono">$367.82</span>
              </div>
            </div>
          </TabsContent>

          {/* Customer Tab */}
          <TabsContent value="customer" className="p-4 space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">CUSTOMER</h3>
              <div className="space-y-1">
                <div className="text-sm font-medium">Sarah Chen</div>
                <div className="text-sm text-muted-foreground font-mono">+1 555-0123</div>
                <div className="text-sm text-muted-foreground">sarah.chen@example.com</div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">BILLING ADDRESS</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Sarah Chen</div>
                <div>123 Market Street, Apt 4B</div>
                <div>San Francisco, CA 94102</div>
                <div>United States</div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">SHIPPING ADDRESS</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Sarah Chen</div>
                <div>123 Market Street, Apt 4B</div>
                <div>San Francisco, CA 94102</div>
                <div>United States</div>
              </div>
            </div>
          </TabsContent>

          {/* Invoice Tab */}
          <TabsContent value="invoice" className="p-4 space-y-4">
            <div className="border border-border rounded aspect-[8.5/11] bg-white flex items-center justify-center">
              <div className="text-center text-black">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="text-xs text-gray-500">Invoice Preview</p>
                <p className="text-xs text-gray-400 font-mono mt-1">INV-2024-142.pdf</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1">
                <Download className="h-3 w-3 mr-2" />
                Download
              </Button>
              <Button size="sm" className="flex-1">
                <Send className="h-3 w-3 mr-2" />
                Send on WhatsApp
              </Button>
            </div>
          </TabsContent>

          {/* Shipping Tab (only for paid orders) */}
          {orderType === "paid" && (
            <TabsContent value="shipping" className="p-4 space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2">SHIPPING METHOD</h3>
                <div className="text-sm">Express Shipping</div>
                <div className="text-xs text-muted-foreground">2-3 business days</div>
              </div>

              <Separator />

              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2">TRACKING</h3>
                <div className="text-sm text-muted-foreground">Not yet shipped</div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Button size="sm" variant="outline" className="w-full justify-start">
                  <Package className="h-3 w-3 mr-2" />
                  Create Shipping Label
                </Button>
                <Button size="sm" variant="outline" className="w-full justify-start">
                  <Package className="h-3 w-3 mr-2" />
                  Mark as Packed
                </Button>
                <Button size="sm" variant="outline" className="w-full justify-start">
                  <MapPin className="h-3 w-3 mr-2" />
                  Add Tracking Number
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </ScrollArea>

      {/* Actions Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <Button size="sm" variant="outline" className="w-full justify-start">
          <MessageSquare className="h-3 w-3 mr-2" />
          Add Note
        </Button>
      </div>
    </div>
  );
}
