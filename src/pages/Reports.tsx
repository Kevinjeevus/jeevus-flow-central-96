import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package,
  Download, FileText, Wallet, Receipt, AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth, parseISO, eachDayOfInterval } from "date-fns";
import { toast } from "sonner";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--success, 142 76% 36%))",
  "hsl(var(--destructive))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground))",
];

type DateRange = { from: string; to: string };

const getDefaultRange = (): DateRange => ({
  from: format(subDays(new Date(), 29), "yyyy-MM-dd"),
  to: format(new Date(), "yyyy-MM-dd"),
});

const presets = [
  { label: "Today", get: () => ({ from: format(new Date(), "yyyy-MM-dd"), to: format(new Date(), "yyyy-MM-dd") }) },
  { label: "Last 7 days", get: () => ({ from: format(subDays(new Date(), 6), "yyyy-MM-dd"), to: format(new Date(), "yyyy-MM-dd") }) },
  { label: "Last 30 days", get: getDefaultRange },
  { label: "This Month", get: () => ({ from: format(startOfMonth(new Date()), "yyyy-MM-dd"), to: format(endOfMonth(new Date()), "yyyy-MM-dd") }) },
  { label: "Last 90 days", get: () => ({ from: format(subDays(new Date(), 89), "yyyy-MM-dd"), to: format(new Date(), "yyyy-MM-dd") }) },
];

const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function exportCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) {
    toast.error("Nothing to export");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Exported");
}

export default function Reports() {
  const [range, setRange] = useState<DateRange>(getDefaultRange());
  const [tab, setTab] = useState("overview");

  // ---- Data ----
  const { data: invoices = [], isLoading: invLoading } = useQuery({
    queryKey: ["rep-invoices", range],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_invoices")
        .select("id, invoice_number, invoice_date, total_amount, subtotal, tax_amount, discount_amount, status, payment_method, customer_id, customers(name)")
        .gte("invoice_date", range.from)
        .lte("invoice_date", range.to)
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["rep-bills", range],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_bills")
        .select("id, bill_number, bill_date, total_amount, status, supplier_id, suppliers(name)")
        .gte("bill_date", range.from)
        .lte("bill_date", range.to);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["rep-expenses", range],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, amount, category, expense_date, description, status")
        .gte("expense_date", range.from)
        .lte("expense_date", range.to);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["rep-payments", range],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, payment_number, amount, payment_type, payment_method, payment_date, status")
        .gte("payment_date", range.from)
        .lte("payment_date", range.to);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: invoiceItems = [] } = useQuery({
    queryKey: ["rep-inv-items", range],
    queryFn: async () => {
      const ids = invoices.map((i: any) => i.id);
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("sales_invoice_items")
        .select("quantity, unit_price, total_price, product_id, sales_invoice_id, products(name, sku)")
        .in("sales_invoice_id", ids);
      if (error) throw error;
      return data || [];
    },
    enabled: invoices.length > 0,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["rep-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, stock_quantity, min_stock_level, sale_price, purchase_price");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["rep-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, outstanding_balance, status");
      if (error) throw error;
      return data || [];
    },
  });

  // ---- KPIs ----
  const totals = useMemo(() => {
    const sales = invoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
    const tax = invoices.reduce((s: number, i: any) => s + Number(i.tax_amount || 0), 0);
    const purchases = bills.reduce((s: number, b: any) => s + Number(b.total_amount || 0), 0);
    const exp = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const pIn = payments.filter((p: any) => p.payment_type === "in").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const pOut = payments.filter((p: any) => p.payment_type === "out").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const profit = sales - purchases - exp;
    const margin = sales ? (profit / sales) * 100 : 0;
    const aov = invoices.length ? sales / invoices.length : 0;
    return { sales, tax, purchases, exp, pIn, pOut, profit, margin, aov };
  }, [invoices, bills, expenses, payments]);

  // ---- Daily trend ----
  const dailyTrend = useMemo(() => {
    const days = eachDayOfInterval({ start: parseISO(range.from), end: parseISO(range.to) });
    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const s = invoices.filter((i: any) => i.invoice_date === key).reduce((a: number, i: any) => a + Number(i.total_amount || 0), 0);
      const p = bills.filter((b: any) => b.bill_date === key).reduce((a: number, b: any) => a + Number(b.total_amount || 0), 0);
      const e = expenses.filter((x: any) => x.expense_date === key).reduce((a: number, x: any) => a + Number(x.amount || 0), 0);
      return { date: format(d, "dd MMM"), Sales: s, Purchases: p, Expenses: e, Profit: s - p - e };
    });
  }, [invoices, bills, expenses, range]);

  // ---- Payment method split ----
  const paymentSplit = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach((i: any) => {
      const m = i.payment_method || "unknown";
      map[m] = (map[m] || 0) + Number(i.total_amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [invoices]);

  // ---- Top products ----
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    invoiceItems.forEach((it: any) => {
      const name = it.products?.name || "Unknown";
      if (!map[name]) map[name] = { name, qty: 0, revenue: 0 };
      map[name].qty += Number(it.quantity || 0);
      map[name].revenue += Number(it.total_price || 0);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [invoiceItems]);

  // ---- Top customers ----
  const topCustomers = useMemo(() => {
    const map: Record<string, { name: string; orders: number; revenue: number }> = {};
    invoices.forEach((i: any) => {
      const name = i.customers?.name || "Unknown";
      if (!map[name]) map[name] = { name, orders: 0, revenue: 0 };
      map[name].orders += 1;
      map[name].revenue += Number(i.total_amount || 0);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [invoices]);

  // ---- Expense categories ----
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e: any) => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  // ---- Low stock ----
  const lowStock = useMemo(() => {
    return products
      .filter((p: any) => Number(p.stock_quantity || 0) <= Number(p.min_stock_level || 0))
      .slice(0, 20);
  }, [products]);

  // ---- Outstanding receivables ----
  const receivables = useMemo(() => {
    return customers
      .filter((c: any) => Number(c.outstanding_balance || 0) > 0)
      .sort((a: any, b: any) => Number(b.outstanding_balance) - Number(a.outstanding_balance))
      .slice(0, 20);
  }, [customers]);

  const totalReceivable = useMemo(
    () => customers.reduce((s: number, c: any) => s + Number(c.outstanding_balance || 0), 0),
    [customers]
  );

  // ---- Render ----
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">Comprehensive insights across sales, purchases, finance and inventory</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className="w-[150px]" />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className="w-[150px]" />
          </div>
          <Select onValueChange={(v) => { const p = presets.find((x) => x.label === v); if (p) setRange(p.get()); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Quick range" /></SelectTrigger>
            <SelectContent>
              {presets.map((p) => <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KpiCard title="Sales" value={fmt(totals.sales)} icon={ShoppingCart} accent="text-primary" sub={`${invoices.length} invoices`} />
        <KpiCard title="Purchases" value={fmt(totals.purchases)} icon={Package} accent="text-accent-foreground" sub={`${bills.length} bills`} />
        <KpiCard title="Expenses" value={fmt(totals.exp)} icon={Receipt} accent="text-destructive" sub={`${expenses.length} entries`} />
        <KpiCard title="Net Profit" value={fmt(totals.profit)} icon={totals.profit >= 0 ? TrendingUp : TrendingDown} accent={totals.profit >= 0 ? "text-green-600" : "text-destructive"} sub={`${totals.margin.toFixed(1)}% margin`} />
        <KpiCard title="Cash In" value={fmt(totals.pIn)} icon={Wallet} accent="text-green-600" sub="Payments received" />
        <KpiCard title="Cash Out" value={fmt(totals.pOut)} icon={Wallet} accent="text-destructive" sub="Payments made" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="receivables">Receivables</TabsTrigger>
          <TabsTrigger value="tax">Tax / GST</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="Sales vs Purchases vs Expenses" onExport={() => exportCSV("daily-trend", dailyTrend)}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Area type="monotone" dataKey="Sales" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} />
                  <Area type="monotone" dataKey="Purchases" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.3} />
                  <Area type="monotone" dataKey="Expenses" stroke={COLORS[3]} fill={COLORS[3]} fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Profit Trend" onExport={() => exportCSV("profit-trend", dailyTrend)}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                  <Line type="monotone" dataKey="Profit" stroke={COLORS[2]} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="Payment Method Split" onExport={() => exportCSV("payment-split", paymentSplit)}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={paymentSplit} dataKey="value" nameKey="name" outerRadius={100} label>
                    {paymentSplit.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Expense Categories" onExport={() => exportCSV("expense-categories", expenseByCategory)}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={expenseByCategory} dataKey="value" nameKey="name" outerRadius={100} label>
                    {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>

        {/* SALES */}
        <TabsContent value="sales" className="space-y-4">
          <ChartCard title="Daily Sales" onExport={() => exportCSV("daily-sales", dailyTrend)}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="Sales" fill={COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>All Invoices ({invoices.length})</CardTitle>
              <div className="flex gap-2 text-sm">
                <Badge variant="outline">AOV: {fmt(totals.aov)}</Badge>
                <Button size="sm" variant="outline" onClick={() => exportCSV("invoices", invoices.map((i: any) => ({
                  invoice: i.invoice_number, date: i.invoice_date, customer: i.customers?.name, status: i.status,
                  payment: i.payment_method, subtotal: i.subtotal, tax: i.tax_amount, total: i.total_amount,
                })))}><Download className="h-4 w-4 mr-1" />Export</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {invoices.map((i: any) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.invoice_number}</TableCell>
                        <TableCell>{i.invoice_date}</TableCell>
                        <TableCell>{i.customers?.name || "—"}</TableCell>
                        <TableCell><Badge variant="outline">{i.status}</Badge></TableCell>
                        <TableCell className="text-right">{fmt(Number(i.total_amount))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRODUCTS */}
        <TabsContent value="products" className="space-y-4">
          <ChartCard title="Top 10 Products by Revenue" onExport={() => exportCSV("top-products", topProducts)}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" width={140} className="text-xs" />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="revenue" fill={COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <Card>
            <CardHeader><CardTitle>Product Performance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Product</TableHead><TableHead className="text-right">Qty Sold</TableHead><TableHead className="text-right">Revenue</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {topProducts.map((p) => (
                    <TableRow key={p.name}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-right">{p.qty}</TableCell>
                      <TableCell className="text-right">{fmt(p.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CUSTOMERS */}
        <TabsContent value="customers" className="space-y-4">
          <ChartCard title="Top 10 Customers" onExport={() => exportCSV("top-customers", topCustomers)}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={topCustomers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" width={140} className="text-xs" />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="revenue" fill={COLORS[2]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <Card>
            <CardHeader><CardTitle>Customer Sales</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Customer</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Revenue</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {topCustomers.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell className="text-right">{c.orders}</TableCell>
                      <TableCell className="text-right">{fmt(c.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PURCHASES */}
        <TabsContent value="purchases" className="space-y-4">
          <ChartCard title="Daily Purchases" onExport={() => exportCSV("daily-purchases", dailyTrend)}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="Purchases" fill={COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Purchase Bills ({bills.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportCSV("purchase-bills", bills.map((b: any) => ({
                bill: b.bill_number, date: b.bill_date, supplier: b.suppliers?.name, status: b.status, total: b.total_amount,
              })))}><Download className="h-4 w-4 mr-1" />Export</Button>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Bill</TableHead><TableHead>Date</TableHead><TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {bills.map((b: any) => (
                      <TableRow key={b.id}>
                        <TableCell>{b.bill_number}</TableCell>
                        <TableCell>{b.bill_date}</TableCell>
                        <TableCell>{b.suppliers?.name || "—"}</TableCell>
                        <TableCell><Badge variant="outline">{b.status}</Badge></TableCell>
                        <TableCell className="text-right">{fmt(Number(b.total_amount))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPENSES */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="Expense Categories" onExport={() => exportCSV("expense-categories", expenseByCategory)}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={expenseByCategory} dataKey="value" nameKey="name" outerRadius={110} label>
                    {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Daily Expenses" onExport={() => exportCSV("daily-expenses", dailyTrend)}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="Expenses" fill={COLORS[3]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>

        {/* CASH FLOW */}
        <TabsContent value="cashflow" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <KpiCard title="Cash In" value={fmt(totals.pIn)} icon={TrendingUp} accent="text-green-600" />
            <KpiCard title="Cash Out" value={fmt(totals.pOut)} icon={TrendingDown} accent="text-destructive" />
            <KpiCard title="Net Cash Flow" value={fmt(totals.pIn - totals.pOut)} icon={Wallet} accent={totals.pIn - totals.pOut >= 0 ? "text-green-600" : "text-destructive"} />
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payments ({payments.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportCSV("payments", payments)}><Download className="h-4 w-4 mr-1" />Export</Button>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Number</TableHead><TableHead>Date</TableHead><TableHead>Type</TableHead>
                    <TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {payments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.payment_number}</TableCell>
                        <TableCell>{p.payment_date}</TableCell>
                        <TableCell><Badge variant={p.payment_type === "in" ? "default" : "destructive"}>{p.payment_type}</Badge></TableCell>
                        <TableCell>{p.payment_method}</TableCell>
                        <TableCell className="text-right">{fmt(Number(p.amount))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVENTORY */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <KpiCard title="Total Products" value={String(products.length)} icon={Package} accent="text-primary" />
            <KpiCard title="Low Stock Items" value={String(lowStock.length)} icon={AlertTriangle} accent="text-destructive" />
            <KpiCard title="Stock Value" value={fmt(products.reduce((s: number, p: any) => s + Number(p.stock_quantity || 0) * Number(p.purchase_price || 0), 0))} icon={DollarSign} accent="text-green-600" />
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Low Stock Alert</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportCSV("low-stock", lowStock)}><Download className="h-4 w-4 mr-1" />Export</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Product</TableHead><TableHead>SKU</TableHead>
                  <TableHead className="text-right">Stock</TableHead><TableHead className="text-right">Min</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {lowStock.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{p.sku}</TableCell>
                      <TableCell className="text-right text-destructive font-semibold">{p.stock_quantity}</TableCell>
                      <TableCell className="text-right">{p.min_stock_level}</TableCell>
                    </TableRow>
                  ))}
                  {lowStock.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">All stock healthy</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RECEIVABLES */}
        <TabsContent value="receivables" className="space-y-4">
          <KpiCard title="Total Outstanding" value={fmt(totalReceivable)} icon={Users} accent="text-destructive" />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Top Outstanding Customers</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportCSV("receivables", receivables)}><Download className="h-4 w-4 mr-1" />Export</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Balance</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {receivables.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                      <TableCell className="text-right text-destructive font-semibold">{fmt(Number(c.outstanding_balance))}</TableCell>
                    </TableRow>
                  ))}
                  {receivables.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No outstanding balances</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAX */}
        <TabsContent value="tax" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <KpiCard title="Taxable Sales" value={fmt(invoices.reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0))} icon={FileText} accent="text-primary" />
            <KpiCard title="Tax Collected" value={fmt(totals.tax)} icon={Receipt} accent="text-green-600" />
            <KpiCard title="Total w/ Tax" value={fmt(totals.sales)} icon={DollarSign} accent="text-primary" />
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tax Summary by Invoice</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportCSV("tax-summary", invoices.map((i: any) => ({
                invoice: i.invoice_number, date: i.invoice_date, taxable: i.subtotal, tax: i.tax_amount, total: i.total_amount,
              })))}><Download className="h-4 w-4 mr-1" />Export</Button>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Invoice</TableHead><TableHead>Date</TableHead>
                    <TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">Tax</TableHead><TableHead className="text-right">Total</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {invoices.map((i: any) => (
                      <TableRow key={i.id}>
                        <TableCell>{i.invoice_number}</TableCell>
                        <TableCell>{i.invoice_date}</TableCell>
                        <TableCell className="text-right">{fmt(Number(i.subtotal))}</TableCell>
                        <TableCell className="text-right">{fmt(Number(i.tax_amount))}</TableCell>
                        <TableCell className="text-right">{fmt(Number(i.total_amount))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {invLoading && <div className="text-center text-muted-foreground py-4">Loading reports...</div>}
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, accent, sub }: { title: string; value: string; icon: any; accent?: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${accent || "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children, onExport }: { title: string; children: React.ReactNode; onExport?: () => void }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        {onExport && <Button size="sm" variant="ghost" onClick={onExport}><Download className="h-4 w-4" /></Button>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
