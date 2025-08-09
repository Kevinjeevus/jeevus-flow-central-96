import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { addMonths, endOfMonth, startOfMonth } from "date-fns";

interface GenerateGSTReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gstrType: "gstr1" | "gstr2" | "gstr3b" | "gstr9";
}

export function GenerateGSTReturnDialog({ open, onOpenChange, gstrType }: GenerateGSTReturnDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const now = new Date();
  const defaultMonth = String(now.getMonth() + 1).padStart(2, "0");
  const defaultYear = String(now.getFullYear());

  const [month, setMonth] = useState<string>(defaultMonth);
  const [year, setYear] = useState<string>(defaultYear);

  const months = useMemo(
    () => [
      { value: "01", label: "January" },
      { value: "02", label: "February" },
      { value: "03", label: "March" },
      { value: "04", label: "April" },
      { value: "05", label: "May" },
      { value: "06", label: "June" },
      { value: "07", label: "July" },
      { value: "08", label: "August" },
      { value: "09", label: "September" },
      { value: "10", label: "October" },
      { value: "11", label: "November" },
      { value: "12", label: "December" },
    ],
    []
  );

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [String(y - 1), String(y), String(y + 1)];
  }, [now]);

  function periodToDates(m: string, y: string) {
    const start = startOfMonth(new Date(parseInt(y), parseInt(m) - 1, 1));
    const end = endOfMonth(start);
    return { start, end };
  }

  function formatReturnPeriod(m: string, y: string) {
    return `${m}${y}`; // MMYYYY
  }

  function dueDateFor(type: GenerateGSTReturnDialogProps["gstrType"], start: Date) {
    // Simple heuristic: 11th (GSTR-1), 20th (GSTR-3B), 15th (GSTR-2), 31 Dec next year (GSTR-9)
    const nextMonth = addMonths(start, 1);
    const year = nextMonth.getFullYear();
    const month = nextMonth.getMonth();
    if (type === "gstr1") return new Date(year, month, 11);
    if (type === "gstr3b") return new Date(year, month, 20);
    if (type === "gstr2") return new Date(year, month, 15);
    if (type === "gstr9") return new Date(start.getFullYear() + 1, 11, 31); // Dec 31 next year
    return new Date(year, month, 20);
  }

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const { start, end } = periodToDates(month, year);
      const period = formatReturnPeriod(month, year);

      // Fetch invoices in range with customer state
      const { data: invoices, error: invErr } = await supabase
        .from("sales_invoices")
        .select("invoice_date, subtotal, tax_amount, customers(state)")
        .gte("invoice_date", start.toISOString().slice(0, 10))
        .lte("invoice_date", end.toISOString().slice(0, 10));
      if (invErr) throw invErr;

      let totalTaxableValue = 0;
      let totalTaxAmount = 0;
      let totalCGST = 0;
      let totalSGST = 0;
      let totalIGST = 0;

      for (const inv of invoices || []) {
        const sub = Number(inv.subtotal) || 0;
        const tax = Number(inv.tax_amount) || 0;
        totalTaxableValue += sub;
        totalTaxAmount += tax;
        // Default split equally into CGST and SGST
        totalCGST += tax / 2;
        totalSGST += tax / 2;

      }

      const payload = {
        gstr_type: gstrType,
        return_period: period,
        due_date: dueDateFor(gstrType, start).toISOString().slice(0, 10),
        filing_date: null as any,
        total_taxable_value: totalTaxableValue,
        total_igst: totalIGST,
        total_cgst: totalCGST,
        total_sgst: totalSGST,
        total_cess: 0,
        total_tax_amount: totalTaxAmount,
        status: "draft",
        json_data: { invoice_count: (invoices || []).length },
      };

      // Upsert behavior: if a draft exists for same type+period, update it
      const { data: existing, error: existErr } = await supabase
        .from("gst_records")
        .select("id, status")
        .eq("gstr_type", gstrType)
        .eq("return_period", period)
        .limit(1)
        .maybeSingle();
      if (existErr) throw existErr;

      if (existing?.id) {
        const { error: updErr } = await supabase
          .from("gst_records")
          .update(payload)
          .eq("id", existing.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from("gst_records")
          .insert(payload);
        if (insErr) throw insErr;
      }
    },
    onSuccess: async () => {
      toast({ title: "GST return generated", description: `Draft ${gstrType.toUpperCase()} created for ${month}/${year}.` });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["gst-returns"] }),
        qc.invalidateQueries({ queryKey: ["gst-summary"] }),
      ]);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Failed to generate", description: err?.message || "Please try again.", variant: "destructive" as any });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate {gstrType.toUpperCase()}</DialogTitle>
          <DialogDescription>Select the period to generate a draft return from your sales data.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div className="space-y-2">
            <Label>Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger aria-label="Select month">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger aria-label="Select year">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
          <Button className="bg-gradient-primary hover:bg-gradient-primary/90" onClick={() => mutate()} disabled={isPending}>
            {isPending ? "Generating..." : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
