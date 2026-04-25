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

      const [{ data: prefixData, error: prefixError }, { count, error: countError }] = await Promise.all([
        supabase.from("transaction_prefixes").select("purchase_bill_prefix, financial_year").maybeSingle(),
        supabase.from("purchase_bills").select("*", { count: "exact", head: true }),
      ]);

      if (prefixError) throw prefixError;
      if (countError) throw countError;

      const next = (count || 0) + 1;
      const padded = next.toString().padStart(getNumberPadding(), "0");
      const prefix = prefixData?.purchase_bill_prefix || "PB/";
      const fy = prefixData?.financial_year || "25-26";
      setBillNumber(`${prefix}${fy}/${padded}`);
    } catch (e) {
      console.error("Error generating purchase bill number:", e);
      setBillNumber(`PB-${Date.now()}`);
    } finally {
      setIsLoading(false);
    }
  };

  return { billNumber, isLoading, regenerateNumber: generateBillNumber };
}
