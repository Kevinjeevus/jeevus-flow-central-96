import { useRealtimeQuery } from "./useRealtimeQuery";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface SalesMetrics {
  totalSales: number;
  totalInvoices: number;
  totalOrders: number;
  totalRevenue: number;
}

export interface RecentSalesActivity {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  date: string;
  status: string;
}

export const useSalesMetrics = () => {
  return useRealtimeQuery({
    queryKey: ["sales-metrics"],
    tableName: "sales_invoices",
    relatedQueryKeys: [["sales-orders"]],
    queryFn: async (): Promise<SalesMetrics> => {
      const { data: invoices, error } = await supabase
        .from("sales_invoices")
        .select("total_amount, status");

      if (error) throw error;

      const totalRevenue = invoices?.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0;
      const totalInvoices = invoices?.length || 0;
      
      const { data: orders, error: ordersError } = await supabase
        .from("sales_orders")
        .select("id");

      if (ordersError) throw ordersError;
      
      const totalOrders = orders?.length || 0;

      return {
        totalSales: totalRevenue,
        totalInvoices,
        totalOrders,
        totalRevenue,
      };
    },
  });
};

export const useRecentSalesActivity = () => {
  return useRealtimeQuery({
    queryKey: ["recent-sales-activity"],
    tableName: "sales_invoices",
    queryFn: async (): Promise<RecentSalesActivity[]> => {
      const { data, error } = await supabase
        .from("sales_invoices")
        .select(`
          id,
          invoice_number,
          total_amount,
          invoice_date,
          status,
          customers (
            name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      return data?.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoice_number || "N/A",
        customerName: (invoice.customers as any)?.name || "Unknown Customer",
        amount: invoice.total_amount || 0,
        date: invoice.invoice_date ? format(new Date(invoice.invoice_date), "MMM dd, yyyy") : "N/A",
        status: invoice.status,
      })) || [];
    },
  });
};