
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Receipt } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SaleReturnForm } from "@/components/SaleReturnForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface ReturnRow {
  id: string;
  credit_note_number: string;
  return_date: string;
  total_amount: number;
  status: string;
  customers: { name: string } | null;
}

export default function SaleReturn() {
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!showReturnForm) fetchRows();
  }, [showReturnForm]);

  const fetchRows = async () => {
    const { data, error } = await supabase
      .from("sale_returns")
      .select("id, credit_note_number, return_date, total_amount, status, customers(name)")
      .order("return_date", { ascending: false });
    if (error) console.error(error);
    setRows(data || []);
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      r.credit_note_number.toLowerCase().includes(term) ||
      (r.customers?.name || "").toLowerCase().includes(term)
    );
  }, [rows, q]);

  if (showReturnForm) {
    return <SaleReturnForm onClose={() => setShowReturnForm(false)} />;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sale Return / Credit Note</h1>
          <p className="text-muted-foreground">Handle returns and credit adjustments</p>
        </div>
        <Button className="bg-gradient-primary hover:bg-gradient-primary/90" onClick={() => setShowReturnForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Return
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input placeholder="Search by credit note or customer..." className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Sale Returns & Credit Notes
          </CardTitle>
          <CardDescription>Process customer returns and issue credit notes</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No returns found</p>
              <p className="text-sm">Process your first return to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Credit Note</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.credit_note_number}</TableCell>
                      <TableCell>{r.customers?.name || "-"}</TableCell>
                      <TableCell>{new Date(r.return_date).toLocaleDateString()}</TableCell>
                      <TableCell>₹{Number(r.total_amount).toFixed(2)}</TableCell>
                      <TableCell className="capitalize">{r.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
