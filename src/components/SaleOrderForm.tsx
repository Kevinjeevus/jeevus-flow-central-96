import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface SaleOrderFormProps {
  onClose: () => void;
}

export function SaleOrderForm({ onClose }: SaleOrderFormProps) {
  const { toast } = useToast();
  const [orderData, setOrderData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    orderNumber: `SO-${Date.now()}`,
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: "",
    notes: "",
    taxRate: 18,
  });

  const [items, setItems] = useState<OrderItem[]>([
    { id: "1", productName: "", quantity: 1, unitPrice: 0, total: 0 }
  ]);

  const addItem = () => {
    const newItem: OrderItem = {
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

  const updateItem = (id: string, field: keyof OrderItem, value: string | number) => {
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
  const taxAmount = (subtotal * orderData.taxRate) / 100;
  const total = subtotal + taxAmount;

  const handleSave = () => {
    toast({
      title: "Order Saved",
      description: "Sale order has been saved as draft",
    });
    onClose();
  };

  const handleConfirm = () => {
    toast({
      title: "Order Confirmed",
      description: "Sale order has been confirmed and sent to customer",
    });
    onClose();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Create Sale Order</h2>
          <p className="text-muted-foreground">Create a new customer order</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button className="bg-gradient-primary hover:bg-gradient-primary/90" onClick={handleConfirm}>
            <Send className="h-4 w-4 mr-2" />
            Confirm Order
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
                value={orderData.customerName}
                onChange={(e) => setOrderData({...orderData, customerName: e.target.value})}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label htmlFor="customerEmail">Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={orderData.customerEmail}
                onChange={(e) => setOrderData({...orderData, customerEmail: e.target.value})}
                placeholder="customer@example.com"
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                value={orderData.customerPhone}
                onChange={(e) => setOrderData({...orderData, customerPhone: e.target.value})}
                placeholder="Enter phone number"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="orderNumber">Order Number</Label>
              <Input
                id="orderNumber"
                value={orderData.orderNumber}
                onChange={(e) => setOrderData({...orderData, orderNumber: e.target.value})}
                placeholder="SO-001"
              />
            </div>
            <div>
              <Label htmlFor="orderDate">Order Date</Label>
              <Input
                id="orderDate"
                type="date"
                value={orderData.orderDate}
                onChange={(e) => setOrderData({...orderData, orderDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="deliveryDate">Expected Delivery</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={orderData.deliveryDate}
                onChange={(e) => setOrderData({...orderData, deliveryDate: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
          <CardDescription>Add products to this order</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-5">
                  <Label>Product</Label>
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
              value={orderData.notes}
              onChange={(e) => setOrderData({...orderData, notes: e.target.value})}
              placeholder="Add any notes for this order"
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({orderData.taxRate}%):</span>
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
