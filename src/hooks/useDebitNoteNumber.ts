import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useDebitNoteNumber() {
  const [debitNoteNumber, setDebitNoteNumber] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateDebitNoteNumber();
  }, []);

  const generateDebitNoteNumber = async () => {
    try {
      setIsLoading(true);

      // Get prefixes
      const { data: prefixData, error: prefixError } = await supabase
        .from("transaction_prefixes")
        .select("purchase_return_prefix, financial_year")
        .maybeSingle();
      if (prefixError) throw prefixError;

      // Count existing debit notes
      const { count, error: countError } = await supabase
        .from("purchase_returns")
        .select("*", { count: "exact", head: true });
      if (countError) throw countError;

      const next = (count || 0) + 1;
      const padded = next.toString().padStart(2, "0");
      const prefix = prefixData?.purchase_return_prefix || "DN/";
      const fy = prefixData?.financial_year || "2025-26";

      setDebitNoteNumber(`${prefix}${fy}/${padded}`);
    } catch (e) {
      console.error("Error generating debit note number", e);
      setDebitNoteNumber(`DN-${Date.now()}`);
    } finally {
      setIsLoading(false);
    }
  };

  return { debitNoteNumber, isLoading, regenerateNumber: generateDebitNoteNumber };
}
