import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getNumberPadding } from "@/lib/numberPadding";

export function useSaleOrderNumber() {
  const [orderNumber, setOrderNumber] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateOrderNumber();
  }, []);

  const generateOrderNumber = async () => {
    try {
      setIsLoading(true);
      
      // 1. Get the transaction prefixes
      const { data: prefixData, error: prefixError } = await supabase
        .from('transaction_prefixes')
        .select('sale_order_prefix, financial_year')
        .maybeSingle();

      if (prefixError) throw prefixError;

      const prefix = prefixData?.sale_order_prefix || 'SO/';
      const financialYear = prefixData?.financial_year || '25-26';
      const basePrefix = `${prefix}${financialYear}/`;

      // 2. Get the latest order to find the last number
      const { data: lastOrder, error: lastError } = await supabase
        .from('sales_orders')
        .select('order_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastError) throw lastError;

      let nextNumber = 1;
      let padding = getNumberPadding();

      if (lastOrder?.order_number) {
        // Try to extract the numeric part from the end
        const match = lastOrder.order_number.match(/(\d+)$/);
        if (match) {
          const lastNumStr = match[1];
          nextNumber = parseInt(lastNumStr, 10) + 1;
          padding = lastNumStr.length; // Preserve existing padding
        }
      }

      const paddedNumber = nextNumber.toString().padStart(padding, "0");
      const generatedNumber = `${basePrefix}${paddedNumber}`;
      setOrderNumber(generatedNumber);
    } catch (error) {
      console.error('Error generating sale order number:', error);
      // Fallback to timestamp-based number
      setOrderNumber(`SO-${Date.now()}`);
    } finally {
      setIsLoading(false);
    }
  };

  return { orderNumber, isLoading, regenerateNumber: generateOrderNumber };
}