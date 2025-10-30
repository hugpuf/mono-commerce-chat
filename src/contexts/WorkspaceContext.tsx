import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WorkspaceContextType {
  workspaceId: string | null;
  workspaceName: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaceId: null,
  workspaceName: null,
  isLoading: true,
  refetch: async () => {},
});

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchWorkspace = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setWorkspaceId(null);
        setWorkspaceName(null);
        return;
      }

      // Get user profile with workspace info
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("workspace_id, workspaces(name)")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching workspace:", profileError);
        return;
      }

      if (profile) {
        setWorkspaceId(profile.workspace_id);
        setWorkspaceName((profile.workspaces as any)?.name || null);
      }
    } catch (error) {
      console.error("Error in fetchWorkspace:", error);
      toast({
        title: "Error loading workspace",
        description: "Please try refreshing the page",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        fetchWorkspace();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <WorkspaceContext.Provider value={{ workspaceId, workspaceName, isLoading, refetch: fetchWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
