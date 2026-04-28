import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Filter, FileText, Edit2, Trash2, Package, Calendar, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InvoicePreview } from "@/components/InvoicePreview";

interface StockTransaction {
  id: string;
  product_id: string;
  transaction_type: string;
  quantity: number;
  batch_number?: string | null;
  description?: string | null;
  transaction_date: string;
  previous_stock: number;
  new_stock: number;
  created_at: string;
  reference_type?: string | null;
  reference_id?: string | null;
  products?: {
    name: string;
    sku: string;
    unit: string;
  } | null;
  invoice?: {
    id: string;
    invoice_number: string;
    customer_name: string;
  } | null;
}

export default function StockRecords() {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTransaction, setEditingTransaction] = useState<StockTransaction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [editDescription, setEditDescription] = useState("");
  const [editBatchNumber, setEditBatchNumber] = useState("");
  const [sortBy, setSortBy] = useState<'date' | 'product'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, [sortBy, sortOrder]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("stock_transactions")
        .select(`
          *,
          products (
            name,
            sku,
            unit
          )
        `)
        .order('transaction_date', { ascending: sortOrder === 'asc' });

      if (error) {
        console.error('Stock transactions fetch error:', error);
        throw error;
      }

      const rows = (data as any[]) || [];

      // Collect linked sales_invoice ids and fetch invoice + customer info
      const invoiceIds = Array.from(new Set(
        rows
          .filter(r => r.reference_type === 'sales_invoice' && r.reference_id)
          .map(r => r.reference_id as string)
      ));

      let invoicesById: Record<string, { id: string; invoice_number: string; customer_name: string }> = {};
      if (invoiceIds.length > 0) {
        const { data: invoices } = await supabase
          .from('sales_invoices')
          .select('id, invoice_number, customers(name)')
          .in('id', invoiceIds);
        (invoices || []).forEach((inv: any) => {
          invoicesById[inv.id] = {
            id: inv.id,
            invoice_number: inv.invoice_number,
            customer_name: inv.customers?.name || '-',
          };
        });
      }

      const enriched = rows.map(r => ({
        ...r,
        invoice: r.reference_type === 'sales_invoice' && r.reference_id
          ? invoicesById[r.reference_id] || null
          : null,
      }));

      setTransactions(enriched);
    } catch (error) {
      console.error('Error fetching stock transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load stock transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select(`
          *,
          customers (name, email, phone, address, gstin),
          sales_invoice_items (
            *,
            products (name, hsn_code, gst_rate, unit)
          )
        `)
        .eq('id', invoiceId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({ title: "Error", description: "Invoice not found", variant: "destructive" });
        return;
      }

      let bankAccount = null;
      if (data.payment_account_id) {
        const { data: accountData } = await supabase
          .from('accounts')
          .select('account_name, account_number, bank_name, ifsc_code, account_holder_name')
          .eq('id', data.payment_account_id)
          .maybeSingle();
        bankAccount = accountData;
      }

      const invoiceForPreview = {
        id: data.id,
        invoice_number: data.invoice_number,
        invoice_date: data.invoice_date,
        payment_method: data.payment_method,
        customer: {
          name: (data as any).customers?.name,
          email: (data as any).customers?.email,
          phone: (data as any).customers?.phone,
          address: (data as any).customers?.address,
          gstin: (data as any).customers?.gstin,
        },
        items: ((data as any).sales_invoice_items || []).map((item: any) => ({
          product_name: item.products?.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          hsn_code: item.products?.hsn_code,
          gst_rate: item.products?.gst_rate,
          unit: item.products?.unit,
        })),
        subtotal: data.subtotal,
        tax_amount: data.tax_amount,
        total_amount: data.total_amount,
        notes: data.notes,
        bank_account: bankAccount,
      };

      setSelectedInvoice(invoiceForPreview);
      setShowInvoicePreview(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load invoice",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (transaction: StockTransaction) => {
    setEditingTransaction(transaction);
    setEditDate(new Date(transaction.transaction_date));
    setEditDescription(transaction.description || "");
    setEditBatchNumber(transaction.batch_number || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingTransaction) return;

    try {
      const { error } = await supabase
        .from("stock_transactions")
        .update({
          transaction_date: format(editDate, 'yyyy-MM-dd'),
          description: editDescription || null,
          batch_number: editBatchNumber || null,
        })
        .eq("id", editingTransaction.id);

      if (error) throw error;

      // Update local state
      setTransactions(transactions.map(t => 
        t.id === editingTransaction.id 
          ? { 
              ...t, 
              transaction_date: format(editDate, 'yyyy-MM-dd'),
              description: editDescription || undefined,
              batch_number: editBatchNumber || undefined,
            }
          : t
      ));

      toast({
        title: "Success",
        description: "Stock transaction updated successfully",
      });

      setIsEditDialogOpen(false);
      setEditingTransaction(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update stock transaction",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (transactionId: string) => {
    if (!confirm("Are you sure you want to delete this stock transaction?")) return;

    try {
      const { error } = await supabase
        .from("stock_transactions")
        .delete()
        .eq("id", transactionId);

      if (error) throw error;

      setTransactions(transactions.filter(t => t.id !== transactionId));
      
      toast({
        title: "Success",
        description: "Stock transaction deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete stock transaction",
        variant: "destructive",
      });
    }
  };

  const filteredTransactions = transactions.filter(transaction =>
    transaction.products?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.products?.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalTransactions = transactions.length;
  const addTransactions = transactions.filter(t => t.transaction_type === 'add').length;
  const reduceTransactions = transactions.filter(t => t.transaction_type === 'reduce').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock Records</h1>
          <p className="text-muted-foreground">
            Track all stock adjustments and inventory movements
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{totalTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Stock Added</p>
                <p className="text-2xl font-bold">{addTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Stock Reduced</p>
                <p className="text-2xl font-bold">{reduceTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search transactions..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={sortBy} onValueChange={(value: 'date' | 'product') => setSortBy(value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="product">Product</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          variant="outline" 
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          <ArrowUpDown className="h-4 w-4 mr-2" />
          {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        </Button>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Stock Transaction Records
          </CardTitle>
          <CardDescription>
            Complete history of all stock adjustments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading stock records...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No stock transactions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Batch No.</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Stock Change</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{format(new Date(transaction.transaction_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{transaction.products?.name}</div>
                        <div className="text-sm text-muted-foreground">{transaction.products?.sku}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={transaction.transaction_type === 'add' ? 'default' : 'destructive'}>
                        {transaction.transaction_type === 'add' ? 'Added' : 'Reduced'}
                      </Badge>
                    </TableCell>
                    <TableCell>{transaction.quantity} {transaction.products?.unit}</TableCell>
                    <TableCell>{transaction.batch_number || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{transaction.description || '-'}</TableCell>
                    <TableCell>
                      <span className={transaction.transaction_type === 'add' ? 'text-green-600' : 'text-red-600'}>
                        {transaction.previous_stock} → {transaction.new_stock}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEdit(transaction)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDelete(transaction.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Stock Transaction</DialogTitle>
            <DialogDescription>
              Update transaction details for {editingTransaction?.products?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-date" className="text-right">
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "col-span-3 justify-start text-left font-normal",
                      !editDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editDate ? format(editDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={editDate}
                    onSelect={(date) => date && setEditDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-batch" className="text-right">
                Batch No.
              </Label>
              <Input
                id="edit-batch"
                value={editBatchNumber}
                onChange={(e) => setEditBatchNumber(e.target.value)}
                className="col-span-3"
                placeholder="Enter batch number"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Description
              </Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="col-span-3"
                placeholder="Enter description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdate}>Update Transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}