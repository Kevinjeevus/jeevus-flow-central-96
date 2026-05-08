import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, Send, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePurchaseBillNumber } from "@/hooks/usePurchaseBillNumber";
import { SupplierForm } from "@/components/SupplierForm";

interface Supplier { id: string; name: string; email?: string; phone?: string }
interface Product { id: string; name: string; purchase_price: number; gst_rate: number }

interface BillItem {
  id: string;
  product_id?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  taxAmount: number;
  total: number;
}

interface PurchaseBillFormProps {
  onClose: () => void;
  onSuccess?: (billId: string) => void;
  editBill?: any;
}

export function PurchaseBillForm({ onClose, onSuccess, editBill }: PurchaseBillFormProps) {
  const { toast } = useToast();
  const { billNumber, isLoading: numLoading } = usePurchaseBillNumber();
  const [manualBillNumber, setManualBillNumber] = useState("");
  const [isManual, setIsManual] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);

  const loadSuppliers = async () => {
    const { data, error } = await supabase.from("suppliers").select("id,name,email,phone").order("name");
    if (error) console.error(error); else setSuppliers(data || []);
  };

  const [billData, setBillData] = useState({
    supplier_id: editBill?.supplier_id || "",
    bill_date: editBill?.bill_date || new Date().toISOString().split("T")[0],
    due_date: editBill?.due_date || "",
    notes: editBill?.notes || "",
    status: editBill?.status || "draft",
  });

  const [items, setItems] = useState<BillItem[]>([
    { id: "1", product_id: undefined, productName: "", quantity: 1, unitPrice: 0, gstRate: 0, taxAmount: 0, total: 0 },
  ]);

  useEffect(() => {
    if (billNumber && !editBill && !isManual) {
      setManualBillNumber(billNumber);
    }
  }, [billNumber, editBill, isManual]);

  useEffect(() => {
    if (editBill) {
      setBillData({
        supplier_id: editBill.supplier_id,
        bill_date: editBill.bill_date,
        due_date: editBill.due_date || "",
        notes: editBill.notes || "",
        status: editBill.status,
      });
      setManualBillNumber(editBill.bill_number);
      setIsManual(true);
    }
    const load = async () => {
      const [{ data: s, error: se }, { data: p, error: pe }] = await Promise.all([
        supabase.from("suppliers").select("id,name,email,phone").order("name"),
        supabase.from("products").select("id,name,purchase_price,gst_rate").eq("status", "active").order("name"),
      ]);
      if (se) console.error(se); else setSuppliers(s || []);
      if (pe) console.error(pe); else setProducts(p || []);
    };
    load();
  }, [editBill]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), product_id: undefined, productName: "", quantity: 1, unitPrice: 0, gstRate: 0, taxAmount: 0, total: 0 },
    ]);
  };

  const removeItem = (id: string) => setItems(items.filter((it) => it.id !== id));

  const updateItem = (id: string, field: keyof BillItem, value: string | number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: value } as BillItem;
        if (field === "product_id" && value) {
          const prod = products.find((p) => p.id === value);
          if (prod) {
            updated.productName = prod.name;
            updated.unitPrice = prod.purchase_price || 0;
            updated.gstRate = prod.gst_rate || 0;
          }
        }
        const subtotal = updated.quantity * updated.unitPrice;
        updated.taxAmount = (subtotal * (updated.gstRate || 0)) / 100;
        updated.total = subtotal + updated.taxAmount;
        return updated;
      })
    );
  };

  const subtotal = useMemo(() => items.reduce((s, it) => s + it.quantity * it.unitPrice, 0), [items]);
  const taxAmount = useMemo(() => items.reduce((s, it) => s + it.taxAmount, 0), [items]);
  const total = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

  const handleSave = async (status: "draft" | "confirmed" = "draft") => {
    try {
      setIsSaving(true);
      if (!billData.supplier_id) {
        toast({ title: "Error", description: "Please select a supplier", variant: "destructive" });
        return;
      }
      const validItems = items.filter((i) => i.product_id && i.quantity > 0);
      if (validItems.length === 0) {
        toast({ title: "Error", description: "Add at least one item", variant: "destructive" });
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({ title: "Error", description: "User not authenticated", variant: "destructive" });
        return;
      }

      let billRec: any;

      if (editBill) {
        const { data, error } = await supabase
          .from("purchase_bills")
          .update({
            supplier_id: billData.supplier_id,
            bill_number: manualBillNumber,
            bill_date: billData.bill_date,
            due_date: billData.due_date || null,
            subtotal,
            tax_amount: taxAmount,
            total_amount: total,
            notes: billData.notes,
            status,
          })
          .eq("id", editBill.id)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Bill not found or could not be updated");
        billRec = data;
        await supabase.from("purchase_bill_items").delete().eq("purchase_bill_id", editBill.id);
      } else {
        const { data, error } = await supabase
          .from("purchase_bills")
          .insert({
            supplier_id: billData.supplier_id,
            user_id: user.id,
            bill_number: manualBillNumber || billNumber || `PB-${Date.now()}`,
            bill_date: billData.bill_date,
            due_date: billData.due_date || null,
            subtotal,
            tax_amount: taxAmount,
            total_amount: total,
            notes: billData.notes,
            status,
          })
          .select()
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Failed to create bill record");
        billRec = data;
      }

      const itemsToInsert = validItems.map((it) => ({
        purchase_bill_id: billRec.id,
        product_id: it.product_id!,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        total_price: it.total,
        gst_rate: it.gstRate,
      }));

      const { error: itemsError } = await supabase.from("purchase_bill_items").insert(itemsToInsert);
      if (itemsError) throw itemsError;

      toast({
        title: editBill ? "Bill Updated" : status === "draft" ? "Bill Saved" : "Bill Confirmed",
        description: editBill
          ? "Purchase bill updated successfully"
          : status === "draft"
          ? "Purchase bill saved as draft"
          : "Purchase bill confirmed",
      });

      onSuccess?.(billRec.id);
      onClose();
    } catch (e) {
      console.error("Error saving bill:", e);
      toast({ title: "Error", description: "Failed to save bill", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">{editBill ? "Edit Purchase Bill" : "Create Purchase Bill"}</h2>
          <p className="text-muted-foreground">{editBill ? "Update vendor bill" : "Record a new vendor invoice"}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
          <Button variant="outline" onClick={() => handleSave("draft")} disabled={isSaving} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" /> Save Draft
          </Button>
          <Button className="bg-gradient-primary hover:bg-gradient-primary/90 w-full sm:w-auto" onClick={() => handleSave("confirmed")} disabled={isSaving}>
            <Send className="h-4 w-4 mr-2" /> Save & Confirm
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vendor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Supplier</Label>
              <Select value={billData.supplier_id} onValueChange={(v) => setBillData({ ...billData, supplier_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bill Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Bill Number</Label>
              <div className="flex gap-2">
                <Input 
                  value={manualBillNumber} 
                  onChange={(e) => {
                    setManualBillNumber(e.target.value);
                    setIsManual(true);
                  }}
                  placeholder="PB/2025-26/01" 
                  className="flex-1"
                />
                {!editBill && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      setIsManual(false);
                      setManualBillNumber(billNumber);
                    }}
                    title="Reset to auto-generated number"
                  >
                    <Plus className="h-4 w-4 rotate-45" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label>Bill Date</Label>
              <Input type="date" value={billData.bill_date} onChange={(e) => setBillData({ ...billData, bill_date: e.target.value })} />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={billData.due_date} onChange={(e) => setBillData({ ...billData, due_date: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bill Items</CardTitle>
          <CardDescription>Add purchased products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((it) => (
              <div key={it.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                  <Label>Product</Label>
                  <Select value={it.product_id} onValueChange={(v) => updateItem(it.id, "product_id", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} - ₹{p.purchase_price} ({p.gst_rate}% GST)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Qty</Label>
                  <Input type="number" min={1} value={it.quantity} onChange={(e) => updateItem(it.id, "quantity", parseInt(e.target.value) || 0)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Unit Price</Label>
                  <Input type="number" step="0.01" value={it.unitPrice} onChange={(e) => updateItem(it.id, "unitPrice", parseFloat(e.target.value) || 0)} />
                </div>
                <div className="md:col-span-1">
                  <Label>GST%</Label>
                  <Input value={`${it.gstRate}%`} disabled className="text-center" />
                </div>
                <div className="md:col-span-2">
                  <Label>Total</Label>
                  <Input value={`₹${it.total.toFixed(2)}`} disabled />
                </div>
                <div className="md:col-span-12 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => removeItem(it.id)} disabled={items.length === 1}>
                    <Trash2 className="h-4 w-4 mr-2" /> Remove
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea rows={4} placeholder="Additional notes" value={billData.notes} onChange={(e) => setBillData({ ...billData, notes: e.target.value })} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bill Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span>Subtotal:</span><span>₹{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Total Tax:</span><span>₹{taxAmount.toFixed(2)}</span></div>
            <div className="flex justify-between text-lg font-bold border-t pt-2"><span>Total:</span><span>₹{total.toFixed(2)}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
