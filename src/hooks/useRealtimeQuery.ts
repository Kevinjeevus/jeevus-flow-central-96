/**
 * useRealtimeQuery — Drop-in replacement for useQuery with Supabase Realtime
 * 
 * Automatically subscribes to Supabase Realtime changes on the specified table
 * and invalidates React Query cache when data changes, keeping the UI in sync
 * across all connected clients.
 * 
 * Usage:
 *   const { data, isLoading } = useRealtimeQuery({
 *     queryKey: ['employees'],
 *     tableName: 'employees',
 *     queryFn: async () => {
 *       const { data } = await supabase.from('employees').select('*');
 *       return data;
 *     },
 *   });
 */

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { cacheManager } from '@/lib/realtime-cache';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeQueryOptions<T> extends Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'> {
  /** React Query cache key */
  queryKey: string[];
  /** The Supabase table to subscribe to */
  tableName: string;
  /** The query function to fetch data */
  queryFn: () => Promise<T>;
  /** Which events to listen to (default: all) */
  events?: RealtimeEvent[];
  /** Optional filter column (e.g. 'user_id') */
  filterColumn?: string;
  /** Optional filter value */
  filterValue?: string;
  /** Additional query keys to invalidate when data changes */
  relatedQueryKeys?: string[][];
  /** Enable/disable realtime (default: true) */
  realtime?: boolean;
  /** Cache TTL in ms (default: 5 min) */
  cacheTtl?: number;
}

export function useRealtimeQuery<T = any>({
  queryKey,
  tableName,
  queryFn,
  events = ['*'],
  filterColumn,
  filterValue,
  relatedQueryKeys = [],
  realtime = true,
  cacheTtl = 5 * 60 * 1000,
  ...queryOptions
}: UseRealtimeQueryOptions<T>) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);

  // Enhanced query function with caching
  const cachedQueryFn = async (): Promise<T> => {
    const cacheKey = `table:${tableName}:${JSON.stringify(queryKey)}`;
    const cached = cacheManager.get<T>(cacheKey);
    
    if (cached !== null) {
      return cached;
    }

    const data = await queryFn();
    cacheManager.set(cacheKey, data, cacheTtl, [queryKey, ...relatedQueryKeys]);
    return data;
  };

  // Set up Supabase Realtime subscription
  useEffect(() => {
    if (!realtime || isSubscribedRef.current) return;

    const channelName = `realtime:${tableName}:${JSON.stringify(queryKey)}`;
    
    let channel = supabase.channel(channelName);

    // Build the subscription filter
    const filter: any = {
      event: events.length === 1 ? events[0] : '*',
      schema: 'public',
      table: tableName,
    };

    if (filterColumn && filterValue) {
      filter.filter = `${filterColumn}=eq.${filterValue}`;
    }

    channel = channel.on(
      'postgres_changes' as any,
      filter,
      (payload: RealtimePostgresChangesPayload<any>) => {
        console.log(`[Realtime] ${tableName}: ${payload.eventType}`, payload);
        
        // Invalidate cache
        const cacheKey = `table:${tableName}:${JSON.stringify(queryKey)}`;
        cacheManager.invalidate(cacheKey);

        // Invalidate React Query cache — this triggers a refetch
        queryClient.invalidateQueries({ queryKey });

        // Also invalidate related queries
        relatedQueryKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
    );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isSubscribedRef.current = true;
        console.log(`[Realtime] Subscribed to ${tableName}`);
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, [tableName, realtime, JSON.stringify(queryKey), JSON.stringify(events)]);

  return useQuery<T, Error>({
    queryKey,
    queryFn: cachedQueryFn,
    staleTime: 30 * 1000, // 30 seconds before background refetch
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
    ...queryOptions,
  });
}
