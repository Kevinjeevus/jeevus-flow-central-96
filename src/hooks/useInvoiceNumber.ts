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
      
      // 1. Get the transaction prefixes
      const { data: prefixData, error: prefixError } = await supabase
        .from('transaction_prefixes')
        .select('sale_prefix, financial_year')
        .maybeSingle();

      if (prefixError) throw prefixError;

      const prefix = prefixData?.sale_prefix || 'INV/';
      const financialYear = prefixData?.financial_year || '25-26';
      const basePrefix = `${prefix}${financialYear}/`;

      // 2. Get the latest invoice to find the last number
      const { data: lastInvoice, error: lastError } = await supabase
        .from('sales_invoices')
        .select('invoice_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastError) throw lastError;

      let nextNumber = 1;
      let padding = getNumberPadding();

      if (lastInvoice?.invoice_number) {
        // Try to extract the numeric part from the end of the last invoice number
        const match = lastInvoice.invoice_number.match(/(\d+)$/);
        if (match) {
          const lastNumStr = match[1];
          nextNumber = parseInt(lastNumStr, 10) + 1;
          padding = lastNumStr.length; // Preserve existing padding
        }
      }

      const paddedNumber = nextNumber.toString().padStart(padding, "0");
      const generatedNumber = `${basePrefix}${paddedNumber}`;
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