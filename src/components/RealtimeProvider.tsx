/**
 * RealtimeProvider — Global realtime subscription manager
 * 
 * Wraps the app and listens for changes on ALL critical business tables.
 * When any table changes, it automatically invalidates the relevant
 * React Query cache keys, ensuring all views stay up-to-date in real-time.
 * 
 * This means: if User A creates an invoice on their screen, User B
 * will see it appear on their screen within seconds — no refresh needed.
 */

import { useEffect, useRef, createContext, useContext, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { cacheManager } from '@/lib/realtime-cache';
import { useToast } from '@/hooks/use-toast';

// Map of table names to the React Query keys they should invalidate
const TABLE_QUERY_MAP: Record<string, string[][]> = {
  // Sales
  sales_invoices: [['sales-metrics'], ['recent-sales-activity'], ['sales-invoices'], ['invoices']],
  sales_orders: [['sales-metrics'], ['sales-orders'], ['sale-orders']],
  sales_invoice_items: [['sales-invoices'], ['invoices']],
  
  // Products & Inventory
  products: [['products'], ['inventory']],
  product_categories: [['product-categories'], ['products']],
  
  // Customers & Suppliers
  customers: [['customers']],
  suppliers: [['suppliers']],
  
  // Purchases
  purchase_bills: [['purchase-bills']],
  purchase_orders: [['purchase-orders']],
  purchase_bill_items: [['purchase-bills']],
  
  // Finance
  accounts: [['accounts'], ['accounts-summary']],
  bank_accounts: [['bank-accounts'], ['accounts']],
  cheques: [['cheques']],
  bank_analysis: [['bank-analysis'], ['bank-analysis-summary']],
  gst_returns: [['gst-returns'], ['gst-summary']],
  payments: [['payments']],
  report_configs: [['report-configs']],
  
  // HRM
  employees: [['employees']],
  profiles: [['profiles']],
  user_roles: [['user-roles']],
  attendance: [['attendance']],
  expenses: [['expenses']],
  
  // CRM
  leads: [['leads'], ['crm']],
  opportunities: [['opportunities'], ['crm']],
  
  // Money
  cash_accounts: [['cash-accounts'], ['accounts']],
  
  // Routes
  routes: [['routes']],
  user_sessions: [['user-sessions']],
  
  // Offers
  discounts: [['discounts'], ['offers']],
  coupons: [['coupons'], ['offers']],
  gifts: [['gifts'], ['offers']],
};

// All tables we want to subscribe to
const WATCHED_TABLES = Object.keys(TABLE_QUERY_MAP);

interface RealtimeContextType {
  isConnected: boolean;
  activeChannels: number;
  lastEvent: { table: string; type: string; timestamp: number } | null;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  activeChannels: 0,
  lastEvent: null,
});

export function useRealtimeStatus() {
  return useContext(RealtimeContext);
}

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeChannels, setActiveChannels] = useState(0);
  const [lastEvent, setLastEvent] = useState<RealtimeContextType['lastEvent']>(null);

  useEffect(() => {
    // Create a single channel that listens to all tables
    const channel = supabase.channel('global-realtime', {
      config: {
        broadcast: { self: true },
      },
    });

    // Subscribe to each watched table
    WATCHED_TABLES.forEach(tableName => {
      channel.on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: tableName,
        },
        (payload: any) => {
          const eventType = payload.eventType as string;
          
          console.log(`[Realtime Global] ${tableName}: ${eventType}`);
          
          // Update last event for UI indicators
          setLastEvent({
            table: tableName,
            type: eventType,
            timestamp: Date.now(),
          });

          // Show a toast notification for non-INSERT events from other users
          // (INSERTs are usually handled by individual page loading states)
          if (eventType !== 'INSERT') {
            const tableTitle = tableName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            toast({
              title: "Live Update",
              description: `${tableTitle} data was just updated.`,
              duration: 3000,
            });
          }

          // Invalidate the in-memory cache for this table
          cacheManager.invalidateByTable(tableName);

          // Invalidate all related React Query keys
          const queryKeys = TABLE_QUERY_MAP[tableName] || [];
          queryKeys.forEach(key => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      );
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        setActiveChannels(WATCHED_TABLES.length);
        console.log(`[Realtime] Global channel subscribed — watching ${WATCHED_TABLES.length} tables`);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setIsConnected(false);
        setActiveChannels(0);
        console.warn(`[Realtime] Global channel ${status}`);
      }
    });

    channelsRef.current = [channel];

    return () => {
      channelsRef.current.forEach(ch => {
        supabase.removeChannel(ch);
      });
      channelsRef.current = [];
      setIsConnected(false);
      setActiveChannels(0);
    };
  }, [queryClient]);

  return (
    <RealtimeContext.Provider value={{ isConnected, activeChannels, lastEvent }}>
      {children}
    </RealtimeContext.Provider>
  );
}
