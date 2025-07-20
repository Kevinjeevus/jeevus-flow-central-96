
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReturnItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  returnReason: string;
  total: number;
}

interface SaleReturnFormProps {
  onClose: () => void;
}

export function SaleReturnForm({ onClose }: SaleReturnFormProps) {
  const { toast } = useToast();
  const [returnData, setReturnData] = useState({
    customerName: "",
    originalInvoice: "",
    returnNumber: `CR-${Date.now()}`,
    returnDate: new Date().toISOString().split('T')[0],
    returnType: "",
    notes: "",
    taxRate: 18,
  });

  const [items, setItems] = useState<ReturnItem[]>([
    { id: "1", productName: "", quantity: 1, unitPrice: 0, returnReason: "", total: 0 }
  ]);

  const addItem = () => {
    const newItem: ReturnItem = {
      id: Date.now().toString(),
      productName: "",
      quantity: 1,
      unitPrice: 0,
      returnReason: "",
      total: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ReturnItem, value: string | number) => {
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
  const taxAmount = (subtotal * returnData.taxRate) / 100;
  const total = subtotal + taxAmount;

  const handleSave = () => {
    toast({
      title: "Return Saved",
      description: "Sale return has been saved as draft",
    });
    onClose();
  };

  const handleProcess = () => {
    toast({
      title: "Return Processed",
      description: "Sale return has been processed successfully",
    });
    onClose();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Create Sale Return</h2>
          <p className="text-muted-foreground">Process a customer return or create credit note</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button className="bg-gradient-primary hover:bg-gradient-primary/90" onClick={handleProcess}>
            <Send className="h-4 w-4 mr-2" />
            Process Return
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Return Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={returnData.customerName}
                onChange={(e) => setReturnData({...returnData, customerName: e.target.value})}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label htmlFor="originalInvoice">Original Invoice</Label>
              <Input
                id="originalInvoice"
                value={returnData.originalInvoice}
                onChange={(e) => setReturnData({...returnData, originalInvoice: e.target.value})}
                placeholder="Original invoice number"
              />
            </div>
            <div>
              <Label htmlFor="returnType">Return Type</Label>
              <Select 
                value={returnData.returnType} 
                onValueChange={(value) => setReturnData({...returnData, returnType: value})}
              >
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
              <Label htmlFor="returnNumber">Return Number</Label>
              <Input
                id="returnNumber"
                value={returnData.returnNumber}
                onChange={(e) => setReturnData({...returnData, returnNumber: e.target.value})}
                placeholder="CR-001"
              />
            </div>
            <div>
              <Label htmlFor="returnDate">Return Date</Label>
              <Input
                id="returnDate"
                type="date"
                value={returnData.returnDate}
                onChange={(e) => setReturnData({...returnData, returnDate: e.target.value})}
              />
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
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-3">
                  <Label>Product</Label>
                  <Input
                    value={item.productName}
                    onChange={(e) => updateItem(item.id, 'productName', e.target.value)}
                    placeholder="Product name"
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
                  <Label>Reason</Label>
                  <Input
                    value={item.returnReason}
                    onChange={(e) => updateItem(item.id, 'returnReason', e.target.value)}
                    placeholder="Return reason"
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
              value={returnData.notes}
              onChange={(e) => setReturnData({...returnData, notes: e.target.value})}
              placeholder="Add any notes about this return"
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Return Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({returnData.taxRate}%):</span>
              <span>₹{taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total Return:</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
