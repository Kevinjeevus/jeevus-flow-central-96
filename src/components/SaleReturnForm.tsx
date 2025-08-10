import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCreditNoteNumber } from "@/hooks/useCreditNoteNumber";

interface Customer { id: string; name: string }
interface Product { id: string; name: string; sale_price: number }

interface ReturnItem {
  id: string;
  productId: string | null;
  quantity: number;
  unitPrice: number;
  returnReason: string;
}

interface SaleReturnFormProps { onClose: () => void }

export function SaleReturnForm({ onClose }: SaleReturnFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { creditNoteNumber, isLoading: numLoading, regenerateNumber } = useCreditNoteNumber();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [returnData, setReturnData] = useState({
    customerId: "",
    originalInvoice: "",
    originalBillDate: "",
    returnNumber: "",
    returnDate: new Date().toISOString().split("T")[0],
    returnType: "credit_note",
    notes: "",
    taxRate: 18,
  });

  const [items, setItems] = useState<ReturnItem[]>([
    { id: "1", productId: null, quantity: 1, unitPrice: 0, returnReason: "" },
  ]);

  useEffect(() => {
    setReturnData((d) => ({ ...d, returnNumber: creditNoteNumber }));
  }, [creditNoteNumber]);

  useEffect(() => {
    const load = async () => {
      const [{ data: c, error: ce }, { data: p, error: pe }] = await Promise.all([
        supabase.from("customers").select("id,name").order("name"),
        supabase.from("products").select("id,name,sale_price").order("name"),
      ]);
      if (ce) console.error(ce); else setCustomers(c || []);
      if (pe) console.error(pe); else setProducts(p || []);
    };
    load();
  }, []);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0), [items]);
  const taxAmount = useMemo(() => (subtotal * returnData.taxRate) / 100, [subtotal, returnData.taxRate]);
  const total = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

  const addItem = () => setItems((prev) => ([...prev, { id: Date.now().toString(), productId: null, quantity: 1, unitPrice: 0, returnReason: "" }]));
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const updateItem = (id: string, patch: Partial<ReturnItem>) => {
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      const next = { ...i, ...patch };
      return next;
    }));
  };

  const onSelectProduct = (rowId: string, productId: string) => {
    const p = products.find((x) => x.id === productId);
    updateItem(rowId, { productId, unitPrice: p?.sale_price ?? 0 });
  };

  const handleSaveOrProcess = async (status: "draft" | "processed") => {
    try {
      if (!user) throw new Error("Not authenticated");
      if (!returnData.customerId) throw new Error("Select a customer");
      const validItems = items.filter((i) => i.productId && i.quantity > 0);
      if (validItems.length === 0) throw new Error("Add at least one item");

      let originalInvoiceId: string | null = null;
      if (returnData.originalInvoice) {
        const { data: inv, error: invErr } = await supabase
          .from("sales_invoices")
          .select("id")
          .eq("invoice_number", returnData.originalInvoice)
          .eq("customer_id", returnData.customerId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!invErr && inv) {
          originalInvoiceId = inv.id;
        }
      }

      const { data: created, error } = await supabase
        .from("sale_returns")
        .insert([
          {
            customer_id: returnData.customerId,
            user_id: user.id,
            original_invoice_id: originalInvoiceId,
            return_date: returnData.returnDate,
            subtotal,
            tax_amount: taxAmount,
            total_amount: total,
            status,
            notes: returnData.notes,
            credit_note_number: returnData.returnNumber || creditNoteNumber,
          },
        ])
        .select("id")
        .single();

      if (error) throw error;

      const rows = validItems.map((i) => ({
        sale_return_id: created!.id,
        product_id: i.productId!,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        total_price: i.quantity * i.unitPrice,
      }));

      const { error: itemsError } = await supabase.from("sale_return_items").insert(rows);
      if (itemsError) throw itemsError;

      toast({ title: status === "processed" ? "Return Processed" : "Return Saved", description: status === "processed" ? "Sale return processed successfully" : "Draft saved" });
      onClose();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message || "Failed to save return", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Create Sale Return / Credit Note</h2>
          <p className="text-muted-foreground">Process a customer return or create a credit note</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={() => handleSaveOrProcess("draft")} disabled={numLoading}>
            <Save className="h-4 w-4 mr-2" /> Save Draft
          </Button>
          <Button className="bg-gradient-primary hover:bg-gradient-primary/90" onClick={() => handleSaveOrProcess("processed")} disabled={numLoading}>
            <Send className="h-4 w-4 mr-2" /> Process Return
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Return Information</CardTitle>
            <CardDescription>Select customer and type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Customer</Label>
              <Select value={returnData.customerId} onValueChange={(v) => setReturnData({ ...returnData, customerId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Return Type</Label>
              <Select value={returnData.returnType} onValueChange={(v) => setReturnData({ ...returnData, returnType: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select return type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="credit_note">Credit Note</SelectItem>
                  <SelectItem value="exchange">Exchange</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Return Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Against Invoice Number</Label>
              <Input
                value={returnData.originalInvoice}
                onChange={(e) => setReturnData({ ...returnData, originalInvoice: e.target.value })}
                placeholder="Enter original invoice number"
              />
            </div>
            <div>
              <Label>Against Bill Date</Label>
              <Input
                type="date"
                value={returnData.originalBillDate}
                onChange={(e) => setReturnData({ ...returnData, originalBillDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Credit Note Number</Label>
              <Input value={returnData.returnNumber} onChange={(e) => setReturnData({ ...returnData, returnNumber: e.target.value })} placeholder="CN-..." />
            </div>
            <div>
              <Label>Return Date</Label>
              <Input type="date" value={returnData.returnDate} onChange={(e) => setReturnData({ ...returnData, returnDate: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Return Items</CardTitle>
          <CardDescription>Add items being returned</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-3">
                  <Label>Product</Label>
                  <Select value={item.productId ?? ""} onValueChange={(v) => onSelectProduct(item.id, v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Quantity</Label>
                  <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="col-span-2">
                  <Label>Unit Price</Label>
                  <Input type="number" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="col-span-3">
                  <Label>Reason</Label>
                  <Input value={item.returnReason} onChange={(e) => updateItem(item.id, { returnReason: e.target.value })} placeholder="Return reason" />
                </div>
                <div className="col-span-1">
                  <Button variant="outline" size="sm" onClick={() => removeItem(item.id)} disabled={items.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addItem} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={returnData.notes} onChange={(e) => setReturnData({ ...returnData, notes: e.target.value })} placeholder="Add any notes about this return" rows={4} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Return Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span>Subtotal:</span><span>₹{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Tax ({returnData.taxRate}%):</span><span>₹{taxAmount.toFixed(2)}</span></div>
            <div className="flex justify-between text-lg font-bold border-t pt-2"><span>Total Return:</span><span>₹{total.toFixed(2)}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
