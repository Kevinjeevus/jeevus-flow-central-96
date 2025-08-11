import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, FileText, MoreHorizontal, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PurchaseBillForm } from "@/components/PurchaseBillForm";

interface PurchaseBill {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date?: string;
  total_amount: number;
  status: string;
  supplier: { name: string; email?: string; phone?: string };
}

export default function PurchaseBills() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Purchase Bills | Vendor Invoices";
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("purchase_bills")
        .select(`*, supplier:suppliers(name, email, phone)`) 
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBills((data as any) || []);
    } catch (e) {
      console.error("Error fetching bills:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() =>
    bills.filter(b =>
      b.bill_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.supplier?.name.toLowerCase().includes(searchQuery.toLowerCase())
    ), [bills, searchQuery]
  );

  const handleSuccess = () => {
    setShowForm(false);
    fetchBills();
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await supabase.from("purchase_bill_items").delete().eq("purchase_bill_id", id);
      const { error } = await supabase.from("purchase_bills").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Deleted", description: "Purchase bill deleted" });
      fetchBills();
    } catch (e) {
      console.error("Delete failed:", e);
      toast({ title: "Error", description: "Failed to delete bill", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  if (showForm) {
    return <PurchaseBillForm onClose={() => setShowForm(false)} onSuccess={handleSuccess} />;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchase Bills</h1>
          <p className="text-muted-foreground">Manage purchase bills and vendor invoices</p>
        </div>
        <Button className="bg-gradient-primary hover:bg-gradient-primary/90" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Purchase Bill
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search purchase bills..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
            <FileText className="h-5 w-5" />
            Purchase Bills
          </CardTitle>
          <CardDescription>
            Track and manage all purchase bills from suppliers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-3 text-muted-foreground">Loading...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No purchase bills found</p>
              <p className="text-sm">Create your first purchase bill to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Bill Number</TableHead>
                    <TableHead className="min-w-[160px]">Supplier</TableHead>
                    <TableHead className="min-w-[120px]">Bill Date</TableHead>
                    <TableHead className="min-w-[120px]">Due Date</TableHead>
                    <TableHead className="min-w-[100px]">Amount</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.bill_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{b.supplier?.name}</div>
                          <div className="text-sm text-muted-foreground">{b.supplier?.email || b.supplier?.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(b.bill_date).toLocaleDateString()}</TableCell>
                      <TableCell>{b.due_date ? new Date(b.due_date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>₹{b.total_amount?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDelete(b.id)} disabled={deletingId === b.id} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
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