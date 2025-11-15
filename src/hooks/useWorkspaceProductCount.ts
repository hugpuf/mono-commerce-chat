import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWorkspaceProductCount(workspaceId: string | null | undefined) {
  return useQuery<number>({
    queryKey: ["product-count", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId as string);

      if (error) throw error;
      return count || 0;
    },
    staleTime: 30_000,
  });
}
