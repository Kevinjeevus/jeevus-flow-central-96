import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getNumberPadding } from "@/lib/numberPadding";

export function useCreditNoteNumber() {
  const [creditNoteNumber, setCreditNoteNumber] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateCreditNoteNumber();
  }, []);

  const generateCreditNoteNumber = async () => {
    try {
      setIsLoading(true);

      // Get prefixes
      const { data: prefixData, error: prefixError } = await supabase
        .from("transaction_prefixes")
        .select("credit_note_prefix, financial_year")
        .maybeSingle();
      if (prefixError) throw prefixError;

      // Count existing credit notes
      const { count, error: countError } = await supabase
        .from("sale_returns")
        .select("*", { count: "exact", head: true });
      if (countError) throw countError;

      const next = (count || 0) + 1;
      const padded = next.toString().padStart(getNumberPadding(), "0");
      const prefix = prefixData?.credit_note_prefix || "CN/";
      const fy = prefixData?.financial_year || "25-26";

      setCreditNoteNumber(`${prefix}${fy}/${padded}`);
    } catch (e) {
      console.error("Error generating credit note number", e);
      setCreditNoteNumber(`CN-${Date.now()}`);
    } finally {
      setIsLoading(false);
    }
  };

  return { creditNoteNumber, isLoading, regenerateNumber: generateCreditNoteNumber };
}
