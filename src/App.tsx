import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import Index from "./pages/Index";
import Conversations from "./pages/Conversations";
import Catalog from "./pages/Catalog";
import Templates from "./pages/Templates";
import Automations from "./pages/Automations";
import Orders from "./pages/Orders";
import Analytics from "./pages/Analytics";
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
            path="/catalog"
            element={
              <AppShell>
                <Catalog />
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
