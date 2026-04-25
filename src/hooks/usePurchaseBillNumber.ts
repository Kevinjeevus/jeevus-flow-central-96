import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getNumberPadding } from "@/lib/numberPadding";

export function usePurchaseBillNumber() {
  const [billNumber, setBillNumber] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateBillNumber();
  }, []);

  const generateBillNumber = async () => {
    try {
      setIsLoading(true);

      // 1. Get the transaction prefixes
      const { data: prefixData, error: prefixError } = await supabase
        .from("transaction_prefixes")
        .select("purchase_bill_prefix, financial_year")
        .maybeSingle();

      if (prefixError) throw prefixError;

      const prefix = prefixData?.purchase_bill_prefix || "PB/";
      const fy = prefixData?.financial_year || "25-26";
      const basePrefix = `${prefix}${fy}/`;

      // 2. Get the latest bill to find the last number
      const { data: lastBill, error: lastError } = await supabase
        .from("purchase_bills")
        .select("bill_number")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastError) throw lastError;

      let nextNumber = 1;
      let padding = getNumberPadding();

      if (lastBill?.bill_number) {
        // Try to extract the numeric part from the end
        const match = lastBill.bill_number.match(/(\d+)$/);
        if (match) {
          const lastNumStr = match[1];
          nextNumber = parseInt(lastNumStr, 10) + 1;
          padding = lastNumStr.length; // Preserve existing padding
        }
      }

      const padded = nextNumber.toString().padStart(padding, "0");
      setBillNumber(`${basePrefix}${padded}`);
    } catch (e) {
      console.error("Error generating purchase bill number:", e);
      setBillNumber(`PB-${Date.now()}`);
    } finally {
      setIsLoading(false);
    }
  };

  return { billNumber, isLoading, regenerateNumber: generateBillNumber };
}
