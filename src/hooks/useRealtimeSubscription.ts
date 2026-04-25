/**
 * useRealtimeSubscription — Low-level hook for custom realtime listeners
 * 
 * Use this when you need to react to specific database changes without
 * a full query/cache cycle (e.g. notifications, live counters, presence).
 * 
 * Usage:
 *   useRealtimeSubscription({
 *     tableName: 'notifications',
 *     events: ['INSERT'],
 *     filterColumn: 'user_id',
 *     filterValue: user?.id,
 *     onInsert: (payload) => showToast(`New notification: ${payload.new.title}`),
 *   });
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

interface UseRealtimeSubscriptionOptions {
  /** The Supabase table to subscribe to */
  tableName: string;
  /** Which events to listen to */
  events?: RealtimeEvent[];
  /** Optional filter column */
  filterColumn?: string;
  /** Optional filter value */
  filterValue?: string;
  /** Callback for INSERT events */
  onInsert?: (payload: RealtimePostgresChangesPayload<any>) => void;
  /** Callback for UPDATE events */
  onUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void;
  /** Callback for DELETE events */
  onDelete?: (payload: RealtimePostgresChangesPayload<any>) => void;
  /** Callback for any event */
  onChange?: (payload: RealtimePostgresChangesPayload<any>) => void;
  /** Enable/disable the subscription */
  enabled?: boolean;
}

export function useRealtimeSubscription({
  tableName,
  events = ['INSERT', 'UPDATE', 'DELETE'],
  filterColumn,
  filterValue,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  enabled = true,
}: UseRealtimeSubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const channelName = `sub:${tableName}:${filterColumn || 'all'}:${filterValue || 'all'}:${Date.now()}`;
    
    let channel = supabase.channel(channelName);

    const filter: any = {
      event: '*',
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
        // Call the general onChange handler
        onChange?.(payload);

        // Call specific event handlers
        switch (payload.eventType) {
          case 'INSERT':
            if (events.includes('INSERT')) onInsert?.(payload);
            break;
          case 'UPDATE':
            if (events.includes('UPDATE')) onUpdate?.(payload);
            break;
          case 'DELETE':
            if (events.includes('DELETE')) onDelete?.(payload);
            break;
        }
      }
    );

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tableName, enabled, filterColumn, filterValue]);
}
