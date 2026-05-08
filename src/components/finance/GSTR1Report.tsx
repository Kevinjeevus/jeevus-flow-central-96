import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileSpreadsheet, Download, Loader2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startOfMonth, endOfMonth } from "date-fns";

interface GSTR1ReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InvoiceRow {
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  customer_gstin: string | null;
  customer_state: string | null;
  hsn_code: string | null;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  gst_rate: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

const MONTHS = [
  { value: "01", label: "January" }, { value: "02", label: "February" },
  { value: "03", label: "March" }, { value: "04", label: "April" },
  { value: "05", label: "May" }, { value: "06", label: "June" },
  { value: "07", label: "July" }, { value: "08", label: "August" },
  { value: "09", label: "September" }, { value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

export function GSTR1Report({ open, onOpenChange }: GSTR1ReportProps) {
  const { toast } = useToast();
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [includeNonTax, setIncludeNonTax] = useState(true);
  const years = [String(now.getFullYear() - 1), String(now.getFullYear()), String(now.getFullYear() + 1)];

  const generate = async () => {
    setLoading(true);
    try {
      const start = startOfMonth(new Date(+year, +month - 1, 1));
      const end = endOfMonth(start);

      const { data: cs } = await supabase.from("company_settings").select("*").maybeSingle();
      setCompany(cs);

      const { data: invoices, error } = await supabase
        .from("sales_invoices")
        .select(`*, customers(name, gstin, state), sales_invoice_items(*, products(name, hsn_code, gst_rate, unit))`)
        .gte("invoice_date", start.toISOString().slice(0, 10))
        .lte("invoice_date", end.toISOString().slice(0, 10))
        .neq("status", "cancelled")
        .order("invoice_date");
      if (error) throw error;

      const allRows: InvoiceRow[] = [];
      for (const inv of invoices || []) {
        for (const item of inv.sales_invoice_items || []) {
          const qty = Number(item.quantity) || 0;
          const price = Number(item.unit_price) || 0;
          const gstRate = Number(item.products?.gst_rate) || 0;
          const lineTotal = Number(item.total_price) || qty * price;
          const taxableValue = lineTotal / (1 + gstRate / 100);
          const taxAmount = lineTotal - taxableValue;
          const isInterstate = false; // Simplified: treat all as intrastate
          allRows.push({
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            customer_name: inv.customers?.name || "Unknown",
            customer_gstin: inv.customers?.gstin || null,
            customer_state: inv.customers?.state || null,
            hsn_code: item.products?.hsn_code || null,
            product_name: item.products?.name || "Unknown",
            quantity: qty,
            unit: item.products?.unit || "NOS",
            unit_price: price,
            total_price: lineTotal,
            gst_rate: gstRate,
            taxable_value: taxableValue,
            cgst: isInterstate ? 0 : taxAmount / 2,
            sgst: isInterstate ? 0 : taxAmount / 2,
            igst: isInterstate ? taxAmount : 0,
            total: lineTotal,
          });
        }
      }
      setRows(allRows);
      setGenerated(true);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Filter rows based on includeNonTax
  const filteredRows = useMemo(() => includeNonTax ? rows : rows.filter(r => r.gst_rate > 0), [rows, includeNonTax]);

  // B2B: invoices where customer has GSTIN
  const b2bRows = useMemo(() => filteredRows.filter(r => r.customer_gstin), [filteredRows]);
  const b2cRows = useMemo(() => filteredRows.filter(r => !r.customer_gstin), [filteredRows]);

  // Aggregate B2B by invoice
  const b2bInvoices = useMemo(() => {
    const map = new Map<string, { invoice_number: string; date: string; gstin: string; name: string; taxable: number; cgst: number; sgst: number; igst: number; total: number; gst_rate: number }>();
    for (const r of b2bRows) {
      const key = r.invoice_number;
      if (map.has(key)) {
        const e = map.get(key)!;
        e.taxable += r.taxable_value;
        e.cgst += r.cgst;
        e.sgst += r.sgst;
        e.igst += r.igst;
        e.total += r.total;
      } else {
        map.set(key, { invoice_number: r.invoice_number, date: r.invoice_date, gstin: r.customer_gstin!, name: r.customer_name, taxable: r.taxable_value, cgst: r.cgst, sgst: r.sgst, igst: r.igst, total: r.total, gst_rate: r.gst_rate });
      }
    }
    return Array.from(map.values());
  }, [b2bRows]);

  // B2C summary by GST rate
  const b2cSummary = useMemo(() => {
    const map = new Map<number, { rate: number; taxable: number; cgst: number; sgst: number; igst: number; total: number; count: number }>();
    for (const r of b2cRows) {
      const key = r.gst_rate;
      if (map.has(key)) {
        const e = map.get(key)!;
        e.taxable += r.taxable_value; e.cgst += r.cgst; e.sgst += r.sgst; e.igst += r.igst; e.total += r.total; e.count++;
      } else {
        map.set(key, { rate: key, taxable: r.taxable_value, cgst: r.cgst, sgst: r.sgst, igst: r.igst, total: r.total, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.rate - b.rate);
  }, [b2cRows]);

  // HSN summary
  const hsnSummary = useMemo(() => {
    const map = new Map<string, { hsn: string; desc: string; qty: number; unit: string; taxable: number; cgst: number; sgst: number; igst: number; total_tax: number; rate: number }>();
    for (const r of filteredRows) {
      const key = r.hsn_code || "N/A";
      if (map.has(key)) {
        const e = map.get(key)!;
        e.qty += r.quantity; e.taxable += r.taxable_value; e.cgst += r.cgst; e.sgst += r.sgst; e.igst += r.igst; e.total_tax += (r.cgst + r.sgst + r.igst);
      } else {
        map.set(key, { hsn: key, desc: r.product_name, qty: r.quantity, unit: r.unit, taxable: r.taxable_value, cgst: r.cgst, sgst: r.sgst, igst: r.igst, total_tax: r.cgst + r.sgst + r.igst, rate: r.gst_rate });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.hsn.localeCompare(b.hsn));
  }, [rows]);

  // Document summary
  const docSummary = useMemo(() => {
    const invoiceNums = [...new Set(filteredRows.map(r => r.invoice_number))];
    return { total: invoiceNums.length, b2b: b2bInvoices.length, b2c: new Set(b2cRows.map(r => r.invoice_number)).size };
  }, [filteredRows, b2bInvoices, b2cRows]);

  // Totals
  const totals = useMemo(() => {
    return filteredRows.reduce((acc, r) => ({ taxable: acc.taxable + r.taxable_value, cgst: acc.cgst + r.cgst, sgst: acc.sgst + r.sgst, igst: acc.igst + r.igst, total: acc.total + r.total }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });
  }, [filteredRows]);

  const fmt = (n: number) => "₹" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const periodLabel = `${MONTHS.find(m => m.value === month)?.label} ${year}`;

  const exportExcel = () => {
    // Build CSV content for Excel
    const sections: string[] = [];
    // Header
    sections.push(`GSTR-1 Report`);
    sections.push(`GSTIN,${company?.gstin || ""}`);
    sections.push(`Business Name,${company?.company_name || ""}`);
    sections.push(`Return Period,${periodLabel}`);
    sections.push(``);

    // B2B
    sections.push(`B2B Invoices (Sales to Registered Dealers)`);
    sections.push(`Invoice No,Date,Customer GSTIN,Party Name,Taxable Value,GST %,CGST,SGST,IGST,Total`);
    for (const inv of b2bInvoices) {
      sections.push(`${inv.invoice_number},${inv.date},${inv.gstin},"${inv.name}",${inv.taxable.toFixed(2)},${inv.gst_rate}%,${inv.cgst.toFixed(2)},${inv.sgst.toFixed(2)},${inv.igst.toFixed(2)},${inv.total.toFixed(2)}`);
    }
    sections.push(``);

    // B2C
    sections.push(`B2C Summary (Sales to Unregistered Dealers)`);
    sections.push(`GST Rate,No. of Invoices,Taxable Value,CGST,SGST,IGST,Total`);
    for (const s of b2cSummary) {
      sections.push(`${s.rate}%,${s.count},${s.taxable.toFixed(2)},${s.cgst.toFixed(2)},${s.sgst.toFixed(2)},${s.igst.toFixed(2)},${s.total.toFixed(2)}`);
    }
    sections.push(``);

    // HSN
    sections.push(`HSN Summary`);
    sections.push(`HSN Code,Description,UQC,Qty,Taxable Value,GST Rate,CGST,SGST,IGST,Total Tax`);
    for (const h of hsnSummary) {
      sections.push(`${h.hsn},"${h.desc}",${h.unit},${h.qty},${h.taxable.toFixed(2)},${h.rate}%,${h.cgst.toFixed(2)},${h.sgst.toFixed(2)},${h.igst.toFixed(2)},${h.total_tax.toFixed(2)}`);
    }
    sections.push(``);

    // Doc summary
    sections.push(`Document Summary`);
    sections.push(`Type,Count`);
    sections.push(`Total Invoices,${docSummary.total}`);
    sections.push(`B2B Invoices,${docSummary.b2b}`);
    sections.push(`B2C Invoices,${docSummary.b2c}`);

    const csv = sections.join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR1_${month}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "GSTR-1 report downloaded as CSV (open in Excel)" });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setGenerated(false); onOpenChange(v); }}>
      <DialogContent className={generated ? "max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col" : "max-w-md"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {generated ? `GSTR-1 Report — ${periodLabel}` : "Generate GSTR-1 Report"}
          </DialogTitle>
        </DialogHeader>

        {!generated ? (
          <>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <div className="flex items-center gap-2">
                <Checkbox id="includeNonTax" checked={includeNonTax} onCheckedChange={(v) => setIncludeNonTax(!!v)} />
                <Label htmlFor="includeNonTax" className="text-sm cursor-pointer">Include Non-Tax (0% GST) Invoices</Label>
              </div>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={generate} disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : "Generate Report"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Business Info */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-bold text-lg">{company?.company_name || "Business"}</div>
                      <div className="text-sm text-muted-foreground">GSTIN: {company?.gstin || "N/A"}</div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div><strong>Period:</strong> {periodLabel}</div>
                    <div><strong>Invoices:</strong> {docSummary.total}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox id="toggleNonTax" checked={includeNonTax} onCheckedChange={(v) => setIncludeNonTax(!!v)} />
                      <Label htmlFor="toggleNonTax" className="text-xs cursor-pointer whitespace-nowrap">Include 0% GST</Label>
                    </div>
                    <Button onClick={exportExcel} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />Export Excel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Taxable Value", val: totals.taxable },
                { label: "CGST", val: totals.cgst },
                { label: "SGST", val: totals.sgst },
                { label: "IGST", val: totals.igst },
                { label: "Total", val: totals.total },
              ].map(c => (
                <Card key={c.label}>
                  <CardContent className="pt-3 pb-2 text-center">
                    <div className="text-xs text-muted-foreground">{c.label}</div>
                    <div className="font-bold text-sm">{fmt(c.val)}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="b2b">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="b2b">B2B <Badge variant="secondary" className="ml-1 text-[10px]">{b2bInvoices.length}</Badge></TabsTrigger>
                <TabsTrigger value="b2c">B2C <Badge variant="secondary" className="ml-1 text-[10px]">{b2cSummary.length}</Badge></TabsTrigger>
                <TabsTrigger value="hsn">HSN <Badge variant="secondary" className="ml-1 text-[10px]">{hsnSummary.length}</Badge></TabsTrigger>
                <TabsTrigger value="docs">Docs</TabsTrigger>
              </TabsList>

              <TabsContent value="b2b" className="mt-3">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">B2B — Sales to Registered Dealers</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    {b2bInvoices.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No B2B invoices for this period</p> : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice No</TableHead><TableHead>Date</TableHead><TableHead>Customer GSTIN</TableHead><TableHead>Party Name</TableHead>
                            <TableHead className="text-right">Taxable Value</TableHead><TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead><TableHead className="text-right">IGST</TableHead><TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {b2bInvoices.map((inv, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                              <TableCell>{new Date(inv.date).toLocaleDateString()}</TableCell>
                              <TableCell className="font-mono text-xs">{inv.gstin}</TableCell>
                              <TableCell>{inv.name}</TableCell>
                              <TableCell className="text-right">{fmt(inv.taxable)}</TableCell>
                              <TableCell className="text-right">{fmt(inv.cgst)}</TableCell>
                              <TableCell className="text-right">{fmt(inv.sgst)}</TableCell>
                              <TableCell className="text-right">{fmt(inv.igst)}</TableCell>
                              <TableCell className="text-right font-medium">{fmt(inv.total)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-muted/50">
                            <TableCell colSpan={4}>Total</TableCell>
                            <TableCell className="text-right">{fmt(b2bInvoices.reduce((s, r) => s + r.taxable, 0))}</TableCell>
                            <TableCell className="text-right">{fmt(b2bInvoices.reduce((s, r) => s + r.cgst, 0))}</TableCell>
                            <TableCell className="text-right">{fmt(b2bInvoices.reduce((s, r) => s + r.sgst, 0))}</TableCell>
                            <TableCell className="text-right">{fmt(b2bInvoices.reduce((s, r) => s + r.igst, 0))}</TableCell>
                            <TableCell className="text-right">{fmt(b2bInvoices.reduce((s, r) => s + r.total, 0))}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="b2c" className="mt-3">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">B2C — Sales to Unregistered Dealers (Rate-wise Summary)</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    {b2cSummary.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No B2C invoices for this period</p> : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>GST Rate</TableHead><TableHead className="text-right">No. of Invoices</TableHead><TableHead className="text-right">Taxable Value</TableHead>
                            <TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead><TableHead className="text-right">IGST</TableHead><TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {b2cSummary.map((s, i) => (
                            <TableRow key={i}>
                              <TableCell><Badge variant="outline">{s.rate}%</Badge></TableCell>
                              <TableCell className="text-right">{s.count}</TableCell>
                              <TableCell className="text-right">{fmt(s.taxable)}</TableCell>
                              <TableCell className="text-right">{fmt(s.cgst)}</TableCell>
                              <TableCell className="text-right">{fmt(s.sgst)}</TableCell>
                              <TableCell className="text-right">{fmt(s.igst)}</TableCell>
                              <TableCell className="text-right font-medium">{fmt(s.total)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-muted/50">
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right">{b2cSummary.reduce((s, r) => s + r.count, 0)}</TableCell>
                            <TableCell className="text-right">{fmt(b2cSummary.reduce((s, r) => s + r.taxable, 0))}</TableCell>
                            <TableCell className="text-right">{fmt(b2cSummary.reduce((s, r) => s + r.cgst, 0))}</TableCell>
                            <TableCell className="text-right">{fmt(b2cSummary.reduce((s, r) => s + r.sgst, 0))}</TableCell>
                            <TableCell className="text-right">{fmt(b2cSummary.reduce((s, r) => s + r.igst, 0))}</TableCell>
                            <TableCell className="text-right">{fmt(b2cSummary.reduce((s, r) => s + r.total, 0))}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="hsn" className="mt-3">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">HSN Summary</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>HSN Code</TableHead><TableHead>Description</TableHead><TableHead>UQC</TableHead>
                          <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Taxable Value</TableHead><TableHead>Rate</TableHead>
                          <TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead><TableHead className="text-right">IGST</TableHead><TableHead className="text-right">Total Tax</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hsnSummary.map((h, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono">{h.hsn}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{h.desc}</TableCell>
                            <TableCell>{h.unit}</TableCell>
                            <TableCell className="text-right">{h.qty}</TableCell>
                            <TableCell className="text-right">{fmt(h.taxable)}</TableCell>
                            <TableCell><Badge variant="outline">{h.rate}%</Badge></TableCell>
                            <TableCell className="text-right">{fmt(h.cgst)}</TableCell>
                            <TableCell className="text-right">{fmt(h.sgst)}</TableCell>
                            <TableCell className="text-right">{fmt(h.igst)}</TableCell>
                            <TableCell className="text-right font-medium">{fmt(h.total_tax)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell colSpan={3}>Total</TableCell>
                          <TableCell className="text-right">{hsnSummary.reduce((s, h) => s + h.qty, 0)}</TableCell>
                          <TableCell className="text-right">{fmt(hsnSummary.reduce((s, h) => s + h.taxable, 0))}</TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right">{fmt(hsnSummary.reduce((s, h) => s + h.cgst, 0))}</TableCell>
                          <TableCell className="text-right">{fmt(hsnSummary.reduce((s, h) => s + h.sgst, 0))}</TableCell>
                          <TableCell className="text-right">{fmt(hsnSummary.reduce((s, h) => s + h.igst, 0))}</TableCell>
                          <TableCell className="text-right">{fmt(hsnSummary.reduce((s, h) => s + h.total_tax, 0))}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="docs" className="mt-3">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Document Summary</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
                      <TableBody>
                        <TableRow><TableCell>Total Invoices Issued</TableCell><TableCell className="text-right font-medium">{docSummary.total}</TableCell></TableRow>
                        <TableRow><TableCell>B2B Invoices (Registered)</TableCell><TableCell className="text-right">{docSummary.b2b}</TableCell></TableRow>
                        <TableRow><TableCell>B2C Invoices (Unregistered)</TableCell><TableCell className="text-right">{docSummary.b2c}</TableCell></TableRow>
                        <TableRow><TableCell>Nil Rated / Exempt</TableCell><TableCell className="text-right">0</TableCell></TableRow>
                        <TableRow><TableCell>Credit / Debit Notes</TableCell><TableCell className="text-right">0</TableCell></TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
