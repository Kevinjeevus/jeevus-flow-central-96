import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSaleOrderNumber() {
  const [orderNumber, setOrderNumber] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateOrderNumber();
  }, []);

  const generateOrderNumber = async () => {
    try {
      setIsLoading(true);
      
      // Get the transaction prefixes
      const { data: prefixData, error: prefixError } = await supabase
        .from('transaction_prefixes')
        .select('sale_order_prefix, financial_year')
        .maybeSingle();

      if (prefixError) throw prefixError;

      // Get the count of existing sale orders to generate next number
      const { count, error: countError } = await supabase
        .from('sales_orders')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      const nextNumber = (count || 0) + 1;
      const paddedNumber = nextNumber.toString().padStart(2, '0');
      
      const prefix = prefixData?.sale_order_prefix || 'SO/';
      const financialYear = prefixData?.financial_year || '2025-26';
      
      const generatedNumber = `${prefix}${financialYear}/${paddedNumber}`;
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