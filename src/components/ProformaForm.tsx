import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProformaItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ProformaFormProps {
  onClose: () => void;
}

export function ProformaForm({ onClose }: ProformaFormProps) {
  const { toast } = useToast();
  const [proformaData, setProformaData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    proformaNumber: `PI-${Date.now()}`,
    proformaDate: new Date().toISOString().split('T')[0],
    validUntil: "",
    notes: "",
    taxRate: 18,
  });

  const [items, setItems] = useState<ProformaItem[]>([
    { id: "1", productName: "", quantity: 1, unitPrice: 0, total: 0 }
  ]);

  const addItem = () => {
    const newItem: ProformaItem = {
      id: Date.now().toString(),
      productName: "",
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ProformaItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = (subtotal * proformaData.taxRate) / 100;
  const total = subtotal + taxAmount;

  const handleSave = () => {
    toast({
      title: "Proforma Invoice Saved",
      description: "Proforma invoice has been saved as draft",
    });
    onClose();
  };

  const handleSend = () => {
    toast({
      title: "Proforma Invoice Sent",
      description: "Proforma invoice has been sent to customer",
    });
    onClose();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Create Proforma Invoice</h2>
          <p className="text-muted-foreground">Create a new proforma invoice</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button className="bg-gradient-primary hover:bg-gradient-primary/90" onClick={handleSend}>
            <Send className="h-4 w-4 mr-2" />
            Send Proforma
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={proformaData.customerName}
                onChange={(e) => setProformaData({...proformaData, customerName: e.target.value})}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label htmlFor="customerEmail">Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={proformaData.customerEmail}
                onChange={(e) => setProformaData({...proformaData, customerEmail: e.target.value})}
                placeholder="customer@example.com"
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                value={proformaData.customerPhone}
                onChange={(e) => setProformaData({...proformaData, customerPhone: e.target.value})}
                placeholder="Enter phone number"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proforma Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="proformaNumber">Proforma Number</Label>
              <Input
                id="proformaNumber"
                value={proformaData.proformaNumber}
                onChange={(e) => setProformaData({...proformaData, proformaNumber: e.target.value})}
                placeholder="PI-001"
              />
            </div>
            <div>
              <Label htmlFor="proformaDate">Proforma Date</Label>
              <Input
                id="proformaDate"
                type="date"
                value={proformaData.proformaDate}
                onChange={(e) => setProformaData({...proformaData, proformaDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="validUntil">Valid Until</Label>
              <Input
                id="validUntil"
                type="date"
                value={proformaData.validUntil}
                onChange={(e) => setProformaData({...proformaData, validUntil: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      
      <Card>
        <CardHeader>
          <CardTitle>Proforma Items</CardTitle>
          <CardDescription>Add products or services to this proforma invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-5">
                  <Label>Product/Service</Label>
                  <Input
                    value={item.productName}
                    onChange={(e) => updateItem(item.id, 'productName', e.target.value)}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                    min="1"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    step="0.01"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Total</Label>
                  <Input
                    value={`₹${item.total.toFixed(2)}`}
                    disabled
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addItem} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
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
            <Textarea
              value={proformaData.notes}
              onChange={(e) => setProformaData({...proformaData, notes: e.target.value})}
              placeholder="Add any notes or terms for this proforma invoice"
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proforma Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({proformaData.taxRate}%):</span>
              <span>₹{taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
