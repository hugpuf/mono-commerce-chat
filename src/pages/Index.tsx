import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceConnections } from "@/hooks/useWorkspaceConnections";

const Index = () => {
  const navigate = useNavigate();
  const { workspaceId, isLoading } = useWorkspace();
  const { data: connections, isLoading: connectionsLoading } = useWorkspaceConnections(workspaceId);

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  // Redirect to conversations if WhatsApp is connected
  useEffect(() => {
    if (!connectionsLoading && connections?.whatsappAccount) {
      navigate("/conversations");
    }
  }, [connections, connectionsLoading, navigate]);

  if (isLoading || connectionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <AppShell>
      <OnboardingChecklist />
    </AppShell>
  );
};

export default Index;
