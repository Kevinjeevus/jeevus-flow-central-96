import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Filter, FileText, Edit2, Trash2, Package, Calendar, ArrowUpDown, CheckSquare, RefreshCw } from "lucide-react";
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
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
    if (!confirm("Are you sure you want to delete this stock transaction? The product stock will be adjusted accordingly.")) return;

    try {
      // Find the transaction to reverse its stock effect
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) return;

      // Determine how to reverse: if stock was added, subtract it back; if reduced, add it back
      const isAddType = ['add', 'purchase', 'opening_stock'].includes(transaction.transaction_type);
      const reverseQty = isAddType ? -transaction.quantity : transaction.quantity;

      // Get current product stock and adjust
      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", transaction.product_id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (product) {
        const newStock = (product.stock_quantity || 0) + reverseQty;
        const { error: updateError } = await supabase
          .from("products")
          .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
          .eq("id", transaction.product_id);

        if (updateError) throw updateError;
      }

      // Now delete the transaction record
      const { error } = await supabase
        .from("stock_transactions")
        .delete()
        .eq("id", transactionId);

      if (error) throw error;

      // Recalculate the stock chain for all remaining transactions of this product
      const { data: remaining } = await supabase
        .from("stock_transactions")
        .select("id, previous_stock, new_stock")
        .eq("product_id", transaction.product_id)
        .order("transaction_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (remaining && remaining.length > 0) {
        let runningStock = 0;
        for (const t of remaining) {
          const delta = t.new_stock - t.previous_stock; // preserve original delta
          const correctedPrev = runningStock;
          const correctedNew = runningStock + delta;
          if (t.previous_stock !== correctedPrev || t.new_stock !== correctedNew) {
            await supabase
              .from("stock_transactions")
              .update({ previous_stock: correctedPrev, new_stock: correctedNew })
              .eq("id", t.id);
          }
          runningStock = correctedNew;
        }
      }

      // Re-fetch to get updated values
      fetchTransactions();
      
      toast({
        title: "Success",
        description: "Stock transaction deleted and product stock adjusted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete stock transaction",
        variant: "destructive",
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} stock transaction(s)? Product stocks will be adjusted accordingly.`)) return;

    try {
      const toDelete = transactions.filter(t => selectedIds.has(t.id));
      const affectedProductIds = new Set<string>();

      for (const transaction of toDelete) {
        const isAddType = ['add', 'purchase', 'opening_stock'].includes(transaction.transaction_type);
        const reverseQty = isAddType ? -transaction.quantity : transaction.quantity;

        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", transaction.product_id)
          .maybeSingle();

        if (product) {
          const newStock = (product.stock_quantity || 0) + reverseQty;
          await supabase
            .from("products")
            .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
            .eq("id", transaction.product_id);
        }

        await supabase
          .from("stock_transactions")
          .delete()
          .eq("id", transaction.id);

        affectedProductIds.add(transaction.product_id);
      }

      // Recalculate the stock chain for each affected product
      for (const productId of affectedProductIds) {
        const { data: remaining } = await supabase
          .from("stock_transactions")
          .select("id, previous_stock, new_stock")
          .eq("product_id", productId)
          .order("transaction_date", { ascending: true })
          .order("created_at", { ascending: true });

        if (remaining && remaining.length > 0) {
          let runningStock = 0;
          for (const t of remaining) {
            const delta = t.new_stock - t.previous_stock;
            const correctedPrev = runningStock;
            const correctedNew = runningStock + delta;
            if (t.previous_stock !== correctedPrev || t.new_stock !== correctedNew) {
              await supabase
                .from("stock_transactions")
                .update({ previous_stock: correctedPrev, new_stock: correctedNew })
                .eq("id", t.id);
            }
            runningStock = correctedNew;
          }
        }
      }

      setSelectedIds(new Set());
      fetchTransactions();

      toast({
        title: "Success",
        description: `${toDelete.length} stock transaction(s) deleted and stocks adjusted`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete stock transactions",
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
  const addTransactions = transactions.filter(t => t.transaction_type === 'add' || t.transaction_type === 'opening_stock').length;
  const reduceTransactions = transactions.filter(t => ['reduce', 'sale', 'sale_adjust', 'purchase_return'].includes(t.transaction_type)).length;

  const handleSyncVerify = async () => {
    setSyncing(true);
    let created = 0;
    let salesSynced = 0;
    let chainFixed = 0;
    let stockMismatches = 0;
    let orphanedCleaned = 0;

    try {
      // ===== PHASE 1: Sync sales invoice items with stock transactions =====
      // Get all sales invoice items with their invoice details
      const { data: allInvoiceItems } = await supabase
        .from("sales_invoice_items")
        .select("id, product_id, quantity, sales_invoice_id, sales_invoices!inner(invoice_date, invoice_number)")
        .order("created_at", { ascending: true });

      if (allInvoiceItems) {
        // Get all sale/sale_adjust/sale_revert transactions with references
        const { data: saleTxns } = await supabase
          .from("stock_transactions")
          .select("id, product_id, quantity, transaction_type, reference_type, reference_id")
          .in("transaction_type", ['sale', 'sale_adjust', 'sale_revert']);

        // Build a set of invoice IDs that already have stock transactions
        const coveredInvoices = new Set<string>();
        if (saleTxns) {
          for (const txn of saleTxns) {
            if (txn.reference_id) {
              coveredInvoices.add(`${txn.reference_id}_${txn.product_id}_${txn.transaction_type}`);
            }
          }
        }

        // Group items by invoice to find missing sale transactions
        for (const item of allInvoiceItems) {
          const key = `${item.sales_invoice_id}_${item.product_id}_sale`;
          if (!coveredInvoices.has(key)) {
            // Check if there's any matching transaction by product+quantity (without reference)
            const hasMatch = saleTxns?.some(t =>
              !t.reference_id &&
              t.product_id === item.product_id &&
              t.quantity === item.quantity &&
              t.transaction_type === 'sale'
            );

            if (!hasMatch) {
              // Get current stock for this product
              const { data: prod } = await supabase
                .from("products")
                .select("stock_quantity")
                .eq("id", item.product_id)
                .maybeSingle();

              const prevStock = prod?.stock_quantity || 0;
              const newStock = prevStock - item.quantity;

              // Create the missing sale transaction
              const invoiceData = item.sales_invoices as any;
              await supabase.from("stock_transactions").insert({
                product_id: item.product_id,
                transaction_type: 'sale',
                quantity: item.quantity,
                previous_stock: prevStock,
                new_stock: newStock,
                description: `Sales invoice ${invoiceData?.invoice_number || ''} (auto-synced)`,
                transaction_date: invoiceData?.invoice_date || new Date().toISOString().split('T')[0],
                reference_type: 'sales_invoice',
                reference_id: item.sales_invoice_id,
              });

              // Update product stock
              await supabase
                .from("products")
                .update({ stock_quantity: newStock })
                .eq("id", item.product_id);

              salesSynced++;
            }
          }
        }
      }

      // ===== PHASE 2: Clean orphaned stock transactions (referencing deleted invoices) =====
      const { data: orphanedTxns } = await supabase
        .from("stock_transactions")
        .select("id, product_id, reference_id, reference_type")
        .eq("reference_type", "sales_invoice")
        .not("reference_id", "is", null);

      if (orphanedTxns) {
        const { data: existingInvoices } = await supabase
          .from("sales_invoices")
          .select("id");

        const invoiceIds = new Set(existingInvoices?.map(i => i.id) || []);

        for (const txn of orphanedTxns) {
          if (txn.reference_id && !invoiceIds.has(txn.reference_id)) {
            // This transaction references a deleted invoice — mark it as orphaned
            await supabase
              .from("stock_transactions")
              .update({ description: (txn as any).description ? `${(txn as any).description} [orphaned - invoice deleted]` : 'Orphaned - invoice deleted' })
              .eq("id", txn.id);
            orphanedCleaned++;
          }
        }
      }

      // ===== PHASE 3: Opening stock & chain verification (existing logic) =====
      const { data: allProducts, error: prodErr } = await supabase
        .from("products")
        .select("id, name, stock_quantity");

      if (prodErr) throw prodErr;
      if (!allProducts) { setSyncing(false); return; }

      for (const product of allProducts) {
        const { data: txns } = await supabase
          .from("stock_transactions")
          .select("id, transaction_type, quantity, previous_stock, new_stock")
          .eq("product_id", product.id)
          .order("transaction_date", { ascending: true })
          .order("created_at", { ascending: true });

        // If product has stock but no transactions, create opening stock
        if ((!txns || txns.length === 0) && (product.stock_quantity || 0) > 0) {
          await supabase.from("stock_transactions").insert({
            product_id: product.id,
            transaction_type: 'opening_stock',
            quantity: product.stock_quantity,
            previous_stock: 0,
            new_stock: product.stock_quantity,
            description: 'Opening Stock (auto-synced)',
            transaction_date: new Date().toISOString().split('T')[0],
          });
          created++;
          continue;
        }

        if (!txns || txns.length === 0) continue;

        // Check for missing opening stock
        const hasOpening = txns.some(t => t.transaction_type === 'opening_stock');
        if (!hasOpening) {
          const firstTxn = txns[0];
          if (firstTxn.previous_stock > 0) {
            const { data: earliestTxn } = await supabase
              .from("stock_transactions")
              .select("transaction_date")
              .eq("product_id", product.id)
              .order("transaction_date", { ascending: true })
              .limit(1)
              .maybeSingle();

            await supabase.from("stock_transactions").insert({
              product_id: product.id,
              transaction_type: 'opening_stock',
              quantity: firstTxn.previous_stock,
              previous_stock: 0,
              new_stock: firstTxn.previous_stock,
              description: 'Opening Stock (auto-synced)',
              transaction_date: earliestTxn?.transaction_date || new Date().toISOString().split('T')[0],
            });
            created++;
          }
        }

        // Recalculate chain
        const { data: refreshedTxns } = await supabase
          .from("stock_transactions")
          .select("id, previous_stock, new_stock")
          .eq("product_id", product.id)
          .order("transaction_date", { ascending: true })
          .order("created_at", { ascending: true });

        if (refreshedTxns && refreshedTxns.length > 0) {
          let runningStock = 0;
          let hadFix = false;
          for (const t of refreshedTxns) {
            const delta = t.new_stock - t.previous_stock;
            const correctedPrev = runningStock;
            const correctedNew = runningStock + delta;
            if (t.previous_stock !== correctedPrev || t.new_stock !== correctedNew) {
              await supabase
                .from("stock_transactions")
                .update({ previous_stock: correctedPrev, new_stock: correctedNew })
                .eq("id", t.id);
              hadFix = true;
            }
            runningStock = correctedNew;
          }
          if (hadFix) chainFixed++;

          // Verify product stock matches final chain value
          if (product.stock_quantity !== runningStock) {
            await supabase
              .from("products")
              .update({ stock_quantity: runningStock })
              .eq("id", product.id);
            stockMismatches++;
          }
        }
      }

      fetchTransactions();

      const messages = [];
      if (salesSynced > 0) messages.push(`${salesSynced} missing sale record(s) created`);
      if (created > 0) messages.push(`${created} opening stock record(s) created`);
      if (chainFixed > 0) messages.push(`${chainFixed} product chain(s) corrected`);
      if (stockMismatches > 0) messages.push(`${stockMismatches} product stock(s) fixed`);
      if (orphanedCleaned > 0) messages.push(`${orphanedCleaned} orphaned record(s) flagged`);

      toast({
        title: messages.length > 0 ? "Sync & Verify Complete" : "All Records Verified ✓",
        description: messages.length > 0
          ? messages.join(', ')
          : "All stock records are correct and in sync with sales",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync & verify stock records",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

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
        <Button 
          variant="outline" 
          onClick={handleSyncVerify}
          disabled={syncing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync & Verify'}
        </Button>
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
        {selectedIds.size > 0 && (
          <Button 
            variant="destructive"
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected ({selectedIds.size})
          </Button>
        )}
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
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={filteredTransactions.length > 0 && selectedIds.size === filteredTransactions.length}
                      onChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Batch No.</TableHead>
                  <TableHead>Stock Change</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => {
                  const stockIncreased = transaction.new_stock >= transaction.previous_stock;
                  const clickable = !!transaction.invoice;
                  return (
                    <TableRow
                      key={transaction.id}
                      className={`${clickable ? "cursor-pointer" : ""} ${selectedIds.has(transaction.id) ? "bg-muted/50" : ""}`}
                      onClick={clickable ? () => handleViewInvoice(transaction.invoice!.id) : undefined}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={selectedIds.has(transaction.id)}
                          onChange={() => toggleSelect(transaction.id)}
                        />
                      </TableCell>
                      <TableCell>{format(new Date(transaction.transaction_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transaction.products?.name}</div>
                          <div className="text-sm text-muted-foreground">{transaction.products?.sku}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={stockIncreased ? 'default' : 'destructive'}>
                          {{ add: 'Added', reduce: 'Reduced', sale: 'Sale', sale_adjust: 'Sale Adjusted', sale_revert: 'Sale Reverted', purchase: 'Purchase', purchase_return: 'Purchase Return', adjustment: 'Adjustment', opening_stock: 'Opening Stock' }[transaction.transaction_type] || transaction.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.quantity} {transaction.products?.unit}</TableCell>
                      <TableCell>{transaction.invoice?.customer_name || '-'}</TableCell>
                      <TableCell>
                        {transaction.invoice ? (
                          <button
                            type="button"
                            className="text-primary hover:underline font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewInvoice(transaction.invoice!.id);
                            }}
                          >
                            {transaction.invoice.invoice_number}
                          </button>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{transaction.batch_number || '-'}</TableCell>
                      <TableCell>
                        <span className={stockIncreased ? 'text-green-600' : 'text-red-600'}>
                          {transaction.previous_stock} → {transaction.new_stock}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
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
                  );
                })}
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

      {/* Invoice Preview */}
      {selectedInvoice && (
        <InvoicePreview
          isOpen={showInvoicePreview}
          onClose={() => {
            setShowInvoicePreview(false);
            setSelectedInvoice(null);
          }}
          invoiceData={selectedInvoice}
          onRefresh={fetchTransactions}
        />
      )}
    </div>
  );
}