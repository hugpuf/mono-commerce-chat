import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WorkspaceConnections {
  catalogSource: any | null;
  paymentProvider: any | null;
  whatsappAccount: any | null;
}

const CACHE_KEY = 'workspace-connections-cache';

const getInitialData = (workspaceId: string | null): WorkspaceConnections | undefined => {
  if (!workspaceId) return undefined;
  
  try {
    const cached = localStorage.getItem(`${CACHE_KEY}-${workspaceId}`);
    return cached ? JSON.parse(cached) : undefined;
  } catch {
    return undefined;
  }
};

const saveToCache = (workspaceId: string | null, data: WorkspaceConnections) => {
  if (!workspaceId) return;
  
  try {
    localStorage.setItem(`${CACHE_KEY}-${workspaceId}`, JSON.stringify(data));
  } catch {
    // Ignore cache errors
  }
};

export const clearWorkspaceConnectionsCache = (workspaceId: string | null) => {
  if (!workspaceId) return;
  
  try {
    localStorage.removeItem(`${CACHE_KEY}-${workspaceId}`);
  } catch {
    // Ignore cache errors
  }
};

export const useWorkspaceConnections = (workspaceId: string | null) => {
  const query = useQuery({
    queryKey: ['workspace-connections', workspaceId],
    queryFn: async (): Promise<WorkspaceConnections> => {
      if (!workspaceId) {
        return {
          catalogSource: null,
          paymentProvider: null,
          whatsappAccount: null,
        };
      }

      // Parallel queries for all connection types
      const [catalogResult, paymentResult, whatsappResult] = await Promise.all([
        // Catalog - only consider it connected if it has a shop_domain AND access_token
        supabase
          .from('catalog_sources')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('status', 'active')
          .not('shop_domain', 'is', null)
          .not('access_token', 'is', null)
          .maybeSingle(),
        
        // Payment
        supabase
          .from('payment_providers')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('status', 'active')
          .maybeSingle(),
        
        // WhatsApp - most recent non-disconnected with phone_number_id
        supabase
          .from('whatsapp_accounts')
          .select('*')
          .eq('workspace_id', workspaceId)
          .neq('status', 'disconnected')
          .not('phone_number_id', 'is', null)
          .order('updated_at', { ascending: false })
          .maybeSingle(),
      ]);

      const whatsapp = whatsappResult.data || null;

      return {
        catalogSource: catalogResult.data || null,
        paymentProvider: paymentResult.data || null,
        whatsappAccount: whatsapp,
      };
    },
    enabled: !!workspaceId,
    staleTime: 1 * 60 * 1000, // Cache for 1 minute
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: 'always', // Always refetch on mount to ensure fresh data
    placeholderData: (previousData) => previousData, // Show previous data while refetching
  });

  // Save to cache when data changes
  useEffect(() => {
    if (query.data) {
      saveToCache(workspaceId, query.data);
    }
  }, [query.data, workspaceId]);

  return query;
};
