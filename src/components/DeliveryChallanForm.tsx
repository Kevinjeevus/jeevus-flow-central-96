
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChallanItem {
  id: string;
  productName: string;
  quantity: number;
  description: string;
}

interface DeliveryChallanFormProps {
  onClose: () => void;
}

export function DeliveryChallanForm({ onClose }: DeliveryChallanFormProps) {
  const { toast } = useToast();
  const [challanData, setChallanData] = useState({
    customerName: "",
    customerAddress: "",
    challanNumber: `DC-${Date.now()}`,
    challanDate: new Date().toISOString().split('T')[0],
    transportDetails: "",
    notes: "",
  });

  const [items, setItems] = useState<ChallanItem[]>([
    { id: "1", productName: "", quantity: 1, description: "" }
  ]);

  const addItem = () => {
    const newItem: ChallanItem = {
      id: Date.now().toString(),
      productName: "",
      quantity: 1,
      description: ""
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ChallanItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSave = () => {
    toast({
      title: "Delivery Challan Saved",
      description: "Delivery challan has been saved as draft",
    });
    onClose();
  };

  const handleDispatch = () => {
    toast({
      title: "Challan Dispatched",
      description: "Delivery challan has been dispatched",
    });
    onClose();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Create Delivery Challan</h2>
          <p className="text-muted-foreground">Create a new delivery challan</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button className="bg-gradient-primary hover:bg-gradient-primary/90" onClick={handleDispatch}>
            <Send className="h-4 w-4 mr-2" />
            Dispatch
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
                value={challanData.customerName}
                onChange={(e) => setChallanData({...challanData, customerName: e.target.value})}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label htmlFor="customerAddress">Delivery Address</Label>
              <Textarea
                id="customerAddress"
                value={challanData.customerAddress}
                onChange={(e) => setChallanData({...challanData, customerAddress: e.target.value})}
                placeholder="Enter delivery address"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Challan Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="challanNumber">Challan Number</Label>
              <Input
                id="challanNumber"
                value={challanData.challanNumber}
                onChange={(e) => setChallanData({...challanData, challanNumber: e.target.value})}
                placeholder="DC-001"
              />
            </div>
            <div>
              <Label htmlFor="challanDate">Challan Date</Label>
              <Input
                id="challanDate"
                type="date"
                value={challanData.challanDate}
                onChange={(e) => setChallanData({...challanData, challanDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="transportDetails">Transport Details</Label>
              <Input
                id="transportDetails"
                value={challanData.transportDetails}
                onChange={(e) => setChallanData({...challanData, transportDetails: e.target.value})}
                placeholder="Transport mode/vehicle details"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items to Deliver</CardTitle>
          <CardDescription>Add items being delivered</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-4">
                  <Label>Product Name</Label>
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
                <div className="col-span-5">
                  <Label>Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="Item description"
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

      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={challanData.notes}
            onChange={(e) => setChallanData({...challanData, notes: e.target.value})}
            placeholder="Add any additional notes or instructions"
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
}
