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

      // 1. Get prefixes
      const { data: prefixData, error: prefixError } = await supabase
        .from("transaction_prefixes")
        .select("credit_note_prefix, financial_year")
        .maybeSingle();
      if (prefixError) throw prefixError;

      const prefix = prefixData?.credit_note_prefix || "CN/";
      const fy = prefixData?.financial_year || "25-26";
      const basePrefix = `${prefix}${fy}/`;

      // 2. Get the latest credit note
      const { data: lastNote, error: lastError } = await supabase
        .from("sale_returns")
        .select("credit_note_number")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastError) throw lastError;

      let nextNumber = 1;
      let padding = getNumberPadding();

      if (lastNote?.credit_note_number) {
        const match = lastNote.credit_note_number.match(/(\d+)$/);
        if (match) {
          const lastNumStr = match[1];
          nextNumber = parseInt(lastNumStr, 10) + 1;
          padding = lastNumStr.length;
        }
      }

      const padded = nextNumber.toString().padStart(padding, "0");
      setCreditNoteNumber(`${basePrefix}${padded}`);
    } catch (e) {
      console.error("Error generating credit note number", e);
      setCreditNoteNumber(`CN-${Date.now()}`);
    } finally {
      setIsLoading(false);
    }
  };

  return { creditNoteNumber, isLoading, regenerateNumber: generateCreditNoteNumber };
}
