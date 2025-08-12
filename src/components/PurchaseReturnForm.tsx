import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDebitNoteNumber } from "@/hooks/useDebitNoteNumber";

interface Supplier { id: string; name: string }
interface Product { id: string; name: string; purchase_price: number; gst_rate?: number }
interface ReturnItem { id: string; productId: string | null; quantity: number; unitPrice: number; }

interface PurchaseReturnFormProps { onClose: () => void; onSaved?: () => void }

export default function PurchaseReturnForm({ onClose, onSaved }: PurchaseReturnFormProps) {
  const { toast } = useToast();
  const { debitNoteNumber, isLoading: numberLoading } = useDebitNoteNumber();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [supplierId, setSupplierId] = useState<string>("");
  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<ReturnItem[]>([
    { id: crypto.randomUUID(), productId: null, quantity: 1, unitPrice: 0 },
  ]);

  useEffect(() => {
    document.title = "Purchase Return / Debit Note | ERP";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Create and process purchase return debit notes with item-wise GST.");
  }, []);

  useEffect(() => {
    const load = async () => {
      const [{ data: supData, error: supErr }, { data: prodData, error: prodErr }] = await Promise.all([
        supabase.from("suppliers").select("id, name").order("name"),
        supabase.from("products").select("id, name, purchase_price, gst_rate").order("name"),
      ]);
      if (supErr) console.error(supErr); else setSuppliers(supData || []);
      if (prodErr) console.error(prodErr); else setProducts(prodData || []);
    };
    load();
  }, []);

  const subtotal = useMemo(() => items.reduce((acc, it) => acc + (it.quantity || 0) * (it.unitPrice || 0), 0), [items]);
  const taxAmount = useMemo(() => items.reduce((acc, it) => {
    const prod = products.find(p => p.id === it.productId);
    const rate = prod?.gst_rate || 0;
    return acc + (it.quantity || 0) * (it.unitPrice || 0) * (rate / 100);
  }, 0), [items, products]);
  const total = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

  const setItem = (id: string, patch: Partial<ReturnItem>) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  };

  const addItem = () => setItems(prev => [...prev, { id: crypto.randomUUID(), productId: null, quantity: 1, unitPrice: 0 }]);
  const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));

  const onSelectProduct = (rowId: string, productId: string) => {
    const prod = products.find(p => p.id === productId);
    setItem(rowId, { productId, unitPrice: prod?.purchase_price || 0 });
  };

  const handleSave = async (status: "draft" | "processed") => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error("Not authenticated");
      if (!supplierId) {
        toast({ title: "Supplier required", description: "Please select a supplier.", variant: "destructive" });
        return;
      }
      if (items.some(it => !it.productId || it.quantity <= 0)) {
        toast({ title: "Invalid items", description: "Select products and valid quantities.", variant: "destructive" });
        return;
      }

      // Insert parent
      const { data: pr, error: prErr } = await supabase
        .from("purchase_returns")
        .insert({
          supplier_id: supplierId,
          user_id: userId,
          return_date: returnDate,
          subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          status,
          notes,
          debit_note_number: debitNoteNumber,
        })
        .select("id")
        .single();
      if (prErr) throw prErr;

      // Insert items
      const itemsToInsert = items.map(it => {
        const prod = products.find(p => p.id === it.productId);
        return {
          purchase_return_id: pr!.id,
          product_id: it.productId!,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          total_price: it.quantity * it.unitPrice,
          gst_rate: prod?.gst_rate || 0,
        };
      });
      const { error: itemErr } = await supabase.from("purchase_return_items").insert(itemsToInsert);
      if (itemErr) throw itemErr;

      toast({ title: status === "processed" ? "Return processed" : "Draft saved", description: `Debit Note ${debitNoteNumber}` });
      onSaved?.();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to save", description: e.message || String(e), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New Purchase Return / Debit Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Debit Note No.</Label>
              <Input value={numberLoading ? "Generating..." : debitNoteNumber} readOnly />
            </div>
            <div>
              <Label>Return Date</Label>
              <Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
            </div>
            <div>
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Items</Label>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Product</TableHead>
                    <TableHead className="w-[15%]">Qty</TableHead>
                    <TableHead className="w-[20%]">Unit Price</TableHead>
                    <TableHead className="w-[15%]">GST %</TableHead>
                    <TableHead className="w-[10%] text-right">Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => {
                    const prod = products.find(p => p.id === it.productId);
                    const amount = (it.quantity || 0) * (it.unitPrice || 0);
                    return (
                      <TableRow key={it.id}>
                        <TableCell>
                          <Select value={it.productId || ""} onValueChange={(v) => onSelectProduct(it.id, v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input type="number" min={1} value={it.quantity}
                            onChange={(e) => setItem(it.id, { quantity: Number(e.target.value) })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min={0} step="0.01" value={it.unitPrice}
                            onChange={(e) => setItem(it.id, { unitPrice: Number(e.target.value) })} />
                        </TableCell>
                        <TableCell>{prod?.gst_rate ?? 0}%</TableCell>
                        <TableCell className="text-right">{amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(it.id)} aria-label="Remove row">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <Button variant="outline" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-4 items-start">
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Input placeholder="Optional notes" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tax (item-wise)</span><span>{taxAmount.toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold"><span>Total</span><span>{total.toFixed(2)}</span></div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="secondary" onClick={() => handleSave("draft")}>Save Draft</Button>
            <Button onClick={() => handleSave("processed")}>Process Return</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
