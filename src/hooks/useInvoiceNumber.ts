import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getNumberPadding } from "@/lib/numberPadding";

export function useInvoiceNumber() {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateInvoiceNumber();
  }, []);

  const generateInvoiceNumber = async () => {
    try {
      setIsLoading(true);
      
      // Get the transaction prefixes
      const { data: prefixData, error: prefixError } = await supabase
        .from('transaction_prefixes')
        .select('sale_prefix, financial_year')
        .maybeSingle();

      if (prefixError) throw prefixError;

      // Get the count of existing invoices to generate next number
      const { count, error: countError } = await supabase
        .from('sales_invoices')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      const nextNumber = (count || 0) + 1;
      const paddedNumber = nextNumber.toString().padStart(getNumberPadding(), "0");
      
      const prefix = prefixData?.sale_prefix || 'INV/';
      const financialYear = prefixData?.financial_year || '25-26';
      
      const generatedNumber = `${prefix}${financialYear}/${paddedNumber}`;
      setInvoiceNumber(generatedNumber);
    } catch (error) {
      console.error('Error generating invoice number:', error);
      // Fallback to timestamp-based number
      setInvoiceNumber(`INV-${Date.now()}`);
    } finally {
      setIsLoading(false);
    }
  };

  return { invoiceNumber, isLoading, regenerateNumber: generateInvoiceNumber };
}