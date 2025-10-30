import { useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { OrderLinksTable } from "@/components/orders/OrderLinksTable";
import { PaidOrdersTable } from "@/components/orders/PaidOrdersTable";
import { OrderDrawer } from "@/components/orders/OrderDrawer";

export default function Orders() {
  const [selectedOrder, setSelectedOrder] = useState<{ type: 'link' | 'paid', id: string } | null>(null);

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Two stacked tables with resizable splitter */}
        <ResizablePanelGroup direction="vertical">
          {/* Table 1: Order Links */}
          <ResizablePanel defaultSize={50} minSize={20}>
            <OrderLinksTable onSelectOrder={(id) => setSelectedOrder({ type: 'link', id })} />
          </ResizablePanel>

          <ResizableHandle className="h-px bg-border hover:bg-foreground/20 transition-colors" />

          {/* Table 2: Paid & To Dispatch */}
          <ResizablePanel defaultSize={50} minSize={20}>
            <PaidOrdersTable onSelectOrder={(id) => setSelectedOrder({ type: 'paid', id })} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Right Drawer */}
      {selectedOrder && (
        <OrderDrawer
          orderId={selectedOrder.id}
          orderType={selectedOrder.type}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}
