import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { addMonths, endOfMonth, startOfMonth } from "date-fns";
import { Download, Loader2 } from "lucide-react";

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
  const [includeNonTax, setIncludeNonTax] = useState(true);
  const [lastGenData, setLastGenData] = useState<any>(null);

  const months = useMemo(
    () => [
      { value: "01", label: "January" }, { value: "02", label: "February" },
      { value: "03", label: "March" }, { value: "04", label: "April" },
      { value: "05", label: "May" }, { value: "06", label: "June" },
      { value: "07", label: "July" }, { value: "08", label: "August" },
      { value: "09", label: "September" }, { value: "10", label: "October" },
      { value: "11", label: "November" }, { value: "12", label: "December" },
    ], []);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [String(y - 1), String(y), String(y + 1)];
  }, [now]);

  function periodToDates(m: string, y: string) {
    const start = startOfMonth(new Date(parseInt(y), parseInt(m) - 1, 1));
    const end = endOfMonth(start);
    return { start, end };
  }

  function formatReturnPeriod(m: string, y: string) { return `${m}${y}`; }

  function dueDateFor(type: GenerateGSTReturnDialogProps["gstrType"], start: Date) {
    const nextMonth = addMonths(start, 1);
    const yr = nextMonth.getFullYear();
    const mo = nextMonth.getMonth();
    if (type === "gstr1") return new Date(yr, mo, 11);
    if (type === "gstr3b") return new Date(yr, mo, 20);
    if (type === "gstr2") return new Date(yr, mo, 15);
    if (type === "gstr9") return new Date(start.getFullYear() + 1, 11, 31);
    return new Date(yr, mo, 20);
  }

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const { start, end } = periodToDates(month, year);
      const period = formatReturnPeriod(month, year);

      // Fetch sales invoices
      let salesQuery = supabase
        .from("sales_invoices")
        .select("invoice_number, invoice_date, subtotal, tax_amount, total_amount, status, customers(name, gstin, state), sales_invoice_items(quantity, unit_price, total_price, products(name, hsn_code, gst_rate, unit))")
        .gte("invoice_date", start.toISOString().slice(0, 10))
        .lte("invoice_date", end.toISOString().slice(0, 10))
        .neq("status", "cancelled");

      const { data: invoices, error: invErr } = await salesQuery;
      if (invErr) throw invErr;

      // Fetch purchase bills for GSTR-2 / GSTR-3B
      let purchases: any[] = [];
      if (gstrType === "gstr2" || gstrType === "gstr3b" || gstrType === "gstr9") {
        const { data: purchData, error: purchErr } = await supabase
          .from("purchase_bills")
          .select("bill_number, bill_date, subtotal, tax_amount, total_amount, status, suppliers(name, gstin, state), purchase_bill_items(quantity, unit_price, total_price, products(name, hsn_code, gst_rate, unit))")
          .gte("bill_date", start.toISOString().slice(0, 10))
          .lte("bill_date", end.toISOString().slice(0, 10));
        if (!purchErr) purchases = purchData || [];
      }

      // Company settings
      const { data: cs } = await supabase.from("company_settings").select("company_name, gstin").maybeSingle();

      // Compute sales totals
      let salesTotalTaxable = 0, salesTotalTax = 0, salesTotalCGST = 0, salesTotalSGST = 0, salesTotalIGST = 0;
      for (const inv of invoices || []) {
        const sub = Number(inv.subtotal) || 0;
        const tax = Number(inv.tax_amount) || 0;
        if (!includeNonTax && tax === 0) continue;
        salesTotalTaxable += sub;
        salesTotalTax += tax;
        salesTotalCGST += tax / 2;
        salesTotalSGST += tax / 2;
      }

      // Compute purchase totals
      let purchTotalTaxable = 0, purchTotalTax = 0, purchTotalCGST = 0, purchTotalSGST = 0;
      for (const bill of purchases) {
        const sub = Number(bill.subtotal) || 0;
        const tax = Number(bill.tax_amount) || 0;
        if (!includeNonTax && tax === 0) continue;
        purchTotalTaxable += sub;
        purchTotalTax += tax;
        purchTotalCGST += tax / 2;
        purchTotalSGST += tax / 2;
      }

      const payload = {
        gstr_type: gstrType,
        return_period: period,
        due_date: dueDateFor(gstrType, start).toISOString().slice(0, 10),
        filing_date: null as any,
        total_taxable_value: gstrType === "gstr2" ? purchTotalTaxable : salesTotalTaxable,
        total_igst: gstrType === "gstr2" ? 0 : salesTotalIGST,
        total_cgst: gstrType === "gstr2" ? purchTotalCGST : salesTotalCGST,
        total_sgst: gstrType === "gstr2" ? purchTotalSGST : salesTotalSGST,
        total_cess: 0,
        total_tax_amount: gstrType === "gstr2" ? purchTotalTax : salesTotalTax,
        status: "draft",
        json_data: {
          invoice_count: (invoices || []).length,
          purchase_count: purchases.length,
          sales_taxable: salesTotalTaxable,
          sales_tax: salesTotalTax,
          purchase_taxable: purchTotalTaxable,
          purchase_tax: purchTotalTax,
          net_tax: salesTotalTax - purchTotalTax,
        },
      };

      // Store for Excel export
      setLastGenData({
        type: gstrType, period: `${months.find(m => m.value === month)?.label} ${year}`,
        company: cs?.company_name || "", gstin: cs?.gstin || "",
        invoices: invoices || [], purchases, payload,
      });

      // Upsert
      const { data: existing } = await supabase
        .from("gst_records").select("id, status")
        .eq("gstr_type", gstrType).eq("return_period", period).limit(1).maybeSingle();

      if (existing?.id) {
        const { error } = await supabase.from("gst_records").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gst_records").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      toast({ title: "GST return generated", description: `Draft ${gstrType.toUpperCase()} created for ${month}/${year}.` });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["gst-returns"] }),
        qc.invalidateQueries({ queryKey: ["gst-summary"] }),
      ]);
    },
    onError: (err: any) => {
      toast({ title: "Failed to generate", description: err?.message || "Please try again.", variant: "destructive" as any });
    },
  });

  const exportExcel = () => {
    if (!lastGenData) {
      toast({ title: "Generate first", description: "Click Generate before exporting.", variant: "destructive" });
      return;
    }
    const d = lastGenData;
    const lines: string[] = [];
    lines.push(`${d.type.toUpperCase()} Report`);
    lines.push(`GSTIN,${d.gstin}`);
    lines.push(`Business,${d.company}`);
    lines.push(`Period,${d.period}`);
    lines.push(``);

    if (d.type === "gstr3b") {
      lines.push(`3.1 Outward Supplies`);
      lines.push(`Description,Taxable Value,CGST,SGST,IGST,Total Tax`);
      lines.push(`Sales,${d.payload.json_data.sales_taxable.toFixed(2)},${(d.payload.json_data.sales_tax / 2).toFixed(2)},${(d.payload.json_data.sales_tax / 2).toFixed(2)},0,${d.payload.json_data.sales_tax.toFixed(2)}`);
      lines.push(``);
      lines.push(`4. Eligible ITC`);
      lines.push(`Description,Taxable Value,CGST,SGST,IGST,Total Tax`);
      lines.push(`Purchases,${d.payload.json_data.purchase_taxable.toFixed(2)},${(d.payload.json_data.purchase_tax / 2).toFixed(2)},${(d.payload.json_data.purchase_tax / 2).toFixed(2)},0,${d.payload.json_data.purchase_tax.toFixed(2)}`);
      lines.push(``);
      lines.push(`Net Tax Payable,${d.payload.json_data.net_tax.toFixed(2)}`);
    } else if (d.type === "gstr2") {
      lines.push(`Inward Supplies (Purchases)`);
      lines.push(`Bill No,Date,Supplier,GSTIN,Taxable,Tax,Total`);
      for (const b of d.purchases) {
        lines.push(`${b.bill_number},${b.bill_date},"${b.suppliers?.name || ''}",${b.suppliers?.gstin || ''},${Number(b.subtotal || 0).toFixed(2)},${Number(b.tax_amount || 0).toFixed(2)},${Number(b.total_amount || 0).toFixed(2)}`);
      }
    } else if (d.type === "gstr9") {
      lines.push(`Annual Summary`);
      lines.push(`Type,Taxable Value,Tax Amount`);
      lines.push(`Outward Supplies (Sales),${d.payload.json_data.sales_taxable.toFixed(2)},${d.payload.json_data.sales_tax.toFixed(2)}`);
      lines.push(`Inward Supplies (Purchases),${d.payload.json_data.purchase_taxable.toFixed(2)},${d.payload.json_data.purchase_tax.toFixed(2)}`);
      lines.push(`Net Tax,${d.payload.json_data.net_tax.toFixed(2)}`);
    }

    const csv = lines.join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${d.type.toUpperCase()}_${month}_${year}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${d.type.toUpperCase()} report downloaded` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate {gstrType.toUpperCase()}</DialogTitle>
          <DialogDescription>Select the period to generate a draft return from your data.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div className="space-y-2">
            <Label>Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger aria-label="Select month"><SelectValue placeholder="Select month" /></SelectTrigger>
              <SelectContent>{months.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger aria-label="Select year"><SelectValue placeholder="Select year" /></SelectTrigger>
              <SelectContent>{years.map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 py-1">
          <Checkbox id="incNonTax" checked={includeNonTax} onCheckedChange={(v) => setIncludeNonTax(!!v)} />
          <Label htmlFor="incNonTax" className="text-sm cursor-pointer">Include Non-Tax (0% GST) Invoices</Label>
        </div>

        <DialogFooter className="gap-2">
          {lastGenData && (
            <Button variant="outline" onClick={exportExcel}>
              <Download className="h-4 w-4 mr-2" />Export Excel
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
          <Button className="bg-gradient-primary hover:bg-gradient-primary/90" onClick={() => mutate()} disabled={isPending}>
            {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
