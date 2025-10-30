import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import Index from "./pages/Index";
import Conversations from "./pages/Conversations";
import Templates from "./pages/Templates";
import Automations from "./pages/Automations";
import Orders from "./pages/Orders";
import Analytics from "./pages/Analytics";
import AddCatalog from "./pages/setup/AddCatalog";
import AddPayment from "./pages/setup/AddPayment";
import AddChannel from "./pages/setup/AddChannel";
import WhatsAppCallback from "./pages/setup/WhatsAppCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route
            path="/conversations"
            element={
              <AppShell>
                <Conversations />
              </AppShell>
            }
          />
          <Route
            path="/templates"
            element={
              <AppShell>
                <Templates />
              </AppShell>
            }
          />
          <Route
            path="/automations"
            element={
              <AppShell>
                <Automations />
              </AppShell>
            }
          />
          <Route
            path="/orders"
            element={
              <AppShell>
                <Orders />
              </AppShell>
            }
          />
          <Route
            path="/analytics"
            element={
              <AppShell>
                <Analytics />
              </AppShell>
            }
          />
          <Route path="/setup/catalog" element={<AddCatalog />} />
          <Route path="/setup/payment" element={<AddPayment />} />
          <Route path="/setup/channel" element={<AddChannel />} />
          <Route path="/setup/whatsapp/callback" element={<WhatsAppCallback />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
