import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, ArrowDownCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PurchaseReturnForm from "@/components/PurchaseReturnForm";

interface ReturnRow {
  id: string;
  debit_note_number: string;
  return_date: string;
  total_amount: number;
  status: string;
  supplier_id: string;
}

export default function PurchaseReturn() {
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = "Purchase Return / Debit Note | ERP";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Manage purchase returns and debit notes with search and item-wise tax.");
  }, []);

  const fetchRows = async () => {
    const [{ data, error }, { data: sData, error: sErr }] = await Promise.all([
      supabase.from("purchase_returns").select("id, debit_note_number, return_date, total_amount, status, supplier_id").order("created_at", { ascending: false }),
      supabase.from("suppliers").select("id, name"),
    ]);
    if (!error) setRows((data as any) || []);
    if (!sErr) setSuppliers(Object.fromEntries((sData || []).map((s: any) => [s.id, s.name])));
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return rows.filter(r =>
      r.debit_note_number?.toLowerCase().includes(term) ||
      suppliers[r.supplier_id]?.toLowerCase().includes(term) ||
      r.status?.toLowerCase().includes(term)
    );
  }, [q, rows, suppliers]);

  if (showForm) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">New Purchase Return / Debit Note</h1>
            <p className="text-muted-foreground">Create a new debit note</p>
          </div>
        </div>
        <PurchaseReturnForm onClose={() => setShowForm(false)} onSaved={fetchRows} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchase Return / Dr. Note</h1>
          <p className="text-muted-foreground">Manage purchase returns and debit notes</p>
        </div>
        <Button className="bg-gradient-primary hover:bg-gradient-primary/90" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Purchase Return
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search debit notes..." 
            className="pl-10"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5" />
            Purchase Returns / Debit Notes
          </CardTitle>
          <CardDescription>
            Track and manage all purchase returns and debit notes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ArrowDownCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No purchase returns found</p>
              <p className="text-sm">Create your first purchase return to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2">Debit Note</th>
                    <th className="py-2">Supplier</th>
                    <th className="py-2">Date</th>
                    <th className="py-2 text-right">Total</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 font-medium">{r.debit_note_number}</td>
                      <td className="py-2">{suppliers[r.supplier_id] || r.supplier_id}</td>
                      <td className="py-2">{new Date(r.return_date).toLocaleDateString()}</td>
                      <td className="py-2 text-right">{Number(r.total_amount).toFixed(2)}</td>
                      <td className="py-2 capitalize">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}