import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const Index = () => {
  const navigate = useNavigate();
  const { isLoading } = useWorkspace();

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  if (isLoading) {
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
