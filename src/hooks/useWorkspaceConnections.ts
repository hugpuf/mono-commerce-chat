import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WorkspaceConnections {
  catalogSource: Record<string, unknown> | null;
  paymentProvider: Record<string, unknown> | null;
  whatsappAccount: Record<string, unknown> | null;
}

const CACHE_KEY = 'workspace-connections-cache';

/** Persist connection metadata in localStorage to reduce redundant fetches. */
const saveToCache = (workspaceId: string | null, data: WorkspaceConnections) => {
  if (!workspaceId) return;

  try {
    localStorage.setItem(`${CACHE_KEY}-${workspaceId}`, JSON.stringify(data));
  } catch {
    // Ignore cache errors
  }
};

/**
 * Remove a workspace's cached connection metadata (e.g., after disconnecting providers).
 */
export const clearWorkspaceConnectionsCache = (workspaceId: string | null) => {
  if (!workspaceId) return;
  
  try {
    localStorage.removeItem(`${CACHE_KEY}-${workspaceId}`);
  } catch {
    // Ignore cache errors
  }
};

/**
 * Fetches the active catalog, payment, and WhatsApp connections for a workspace.
 *
 * @param workspaceId Workspace identifier; disables the query when nullish.
 * @returns React Query result with connection records plus optimistic caching.
 */
export const useWorkspaceConnections = (workspaceId: string | null) => {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedDataRef = useRef<string | null>(null);

  useEffect(() => {
    lastSavedDataRef.current = null;
  }, [workspaceId]);

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
        // Catalog - fetch any active catalog source (Shopify or manual)
        supabase
          .from('catalog_sources')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('status', 'active')
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

      let catalogSource = catalogResult.data;

      // If no formal catalog source, check if manual products exist
      if (!catalogSource) {
        const { count } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .eq('status', 'active');
        
        if (count && count > 0) {
          // Create a virtual catalog source for manual catalogs
          catalogSource = { 
            provider: 'manual', 
            status: 'active', 
            products_count: count 
          } as any;
        }
      }

      const whatsapp = whatsappResult.data || null;

      return {
        catalogSource,
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
    if (!workspaceId || !query.data) {
      return;
    }

    const serializedData = JSON.stringify(query.data);
    if (serializedData === lastSavedDataRef.current) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveToCache(workspaceId, query.data);
      lastSavedDataRef.current = serializedData;
      saveTimeoutRef.current = null;
    }, 250);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [query.data, workspaceId]);

  return query;
};
