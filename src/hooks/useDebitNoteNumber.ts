import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getNumberPadding } from "@/lib/numberPadding";

export function useDebitNoteNumber() {
  const [debitNoteNumber, setDebitNoteNumber] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateDebitNoteNumber();
  }, []);

  const generateDebitNoteNumber = async () => {
    try {
      setIsLoading(true);

      // 1. Get prefixes
      const { data: prefixData, error: prefixError } = await supabase
        .from("transaction_prefixes")
        .select("purchase_return_prefix, financial_year")
        .maybeSingle();
      if (prefixError) throw prefixError;

      const prefix = prefixData?.purchase_return_prefix || "DN/";
      const fy = prefixData?.financial_year || "25-26";
      const basePrefix = `${prefix}${fy}/`;

      // 2. Get latest debit note
      const { data: lastNote, error: lastError } = await supabase
        .from("purchase_returns")
        .select("debit_note_number")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastError) throw lastError;

      let nextNumber = 1;
      let padding = getNumberPadding();

      if (lastNote?.debit_note_number) {
        const match = lastNote.debit_note_number.match(/(\d+)$/);
        if (match) {
          const lastNumStr = match[1];
          nextNumber = parseInt(lastNumStr, 10) + 1;
          padding = lastNumStr.length;
        }
      }

      const padded = nextNumber.toString().padStart(padding, "0");
      setDebitNoteNumber(`${basePrefix}${padded}`);
    } catch (e) {
      console.error("Error generating debit note number", e);
      setDebitNoteNumber(`DN-${Date.now()}`);
    } finally {
      setIsLoading(false);
    }
  };

  return { debitNoteNumber, isLoading, regenerateNumber: generateDebitNoteNumber };
}
