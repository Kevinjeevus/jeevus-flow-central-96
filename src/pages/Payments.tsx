import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  Wallet,
  Download,
} from "lucide-react";
import { PaymentForm } from "@/components/PaymentForm";
import { PaymentsList } from "@/components/finance/PaymentsList";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Payments() {
  const [activeTab, setActiveTab] = useState<"payment_in" | "payment_out">(
    "payment_in"
  );
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(
          `*, customers (name), suppliers (name), accounts (account_name)`
        )
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return payments
      .filter((p: any) => p.payment_type === activeTab)
      .filter((p: any) => {
        if (methodFilter !== "all" && p.payment_method !== methodFilter)
          return false;
        if (statusFilter !== "all" && p.status !== statusFilter) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          p.payment_number?.toLowerCase().includes(q) ||
          p.reference_number?.toLowerCase().includes(q) ||
          p.customers?.name?.toLowerCase().includes(q) ||
          p.suppliers?.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
        );
      });
  }, [payments, activeTab, search, methodFilter, statusFilter]);

  const stats = useMemo(() => {
    const ins = payments.filter((p: any) => p.payment_type === "payment_in");
    const outs = payments.filter((p: any) => p.payment_type === "payment_out");
    const sum = (arr: any[]) =>
      arr.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const inTotal = sum(ins);
    const outTotal = sum(outs);
    return {
      inTotal,
      outTotal,
      net: inTotal - outTotal,
      count: payments.length,
    };
  }, [payments]);

  const handleExport = () => {
    const headers = [
      "Number",
      "Date",
      "Type",
      "Party",
      "Account",
      "Method",
      "Status",
      "Amount",
      "Reference",
    ];
    const rows = filtered.map((p: any) => [
      p.payment_number,
      p.payment_date,
      p.payment_type,
      p.customers?.name || p.suppliers?.name || "",
      p.accounts?.account_name || "",
      p.payment_method,
      p.status,
      p.amount,
      p.reference_number || "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c ?? ""}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${activeTab}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (showForm) {
    return (
      <PaymentForm
        payment={editing}
        paymentType={activeTab}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground">
            Manage all incoming and outgoing payments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            className="bg-gradient-primary hover:bg-gradient-primary/90"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total In</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{stats.inTotal.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Out</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ₹{stats.outTotal.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                stats.net >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              ₹{stats.net.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.count}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by number, party, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "payment_in" | "payment_out")}
      >
        <TabsList className="grid w-full md:w-96 grid-cols-2">
          <TabsTrigger value="payment_in" className="gap-2">
            <ArrowDownCircle className="h-4 w-4" />
            Payment In
          </TabsTrigger>
          <TabsTrigger value="payment_out" className="gap-2">
            <ArrowUpCircle className="h-4 w-4" />
            Payment Out
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payment_in" className="mt-4">
          <PaymentsList
            payments={filtered}
            isLoading={isLoading}
            paymentType="payment_in"
            onEdit={(p) => {
              setEditing(p);
              setShowForm(true);
            }}
          />
        </TabsContent>
        <TabsContent value="payment_out" className="mt-4">
          <PaymentsList
            payments={filtered}
            isLoading={isLoading}
            paymentType="payment_out"
            onEdit={(p) => {
              setEditing(p);
              setShowForm(true);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
