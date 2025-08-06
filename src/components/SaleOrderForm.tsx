import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Save, Send, Search, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSaleOrderNumber } from "@/hooks/useSaleOrderNumber";
import { CustomerForm } from "./CustomerForm";

interface OrderItem {
  id: string;
  product_id?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  taxAmount: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  city?: string;
  status: string;
}

interface Product {
  id: string;
  name: string;
  sale_price: number;
  sku: string;
  unit: string;
  status: string;
  gst_rate: number;
}

interface SaleOrderFormProps {
  onClose: () => void;
  onSuccess?: (orderId: string) => void;
}

export function SaleOrderForm({ onClose, onSuccess }: SaleOrderFormProps) {
  const { toast } = useToast();
  const { orderNumber, isLoading: orderNumberLoading } = useSaleOrderNumber();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

  const [orderData, setOrderData] = useState({
    customer_id: "",
    order_date: new Date().toISOString().split('T')[0],
    delivery_date: "",
    notes: "",
    status: 'pending'
  });

  const [items, setItems] = useState<OrderItem[]>([
    { id: "1", product_id: "", productName: "", quantity: 1, unitPrice: 0, gstRate: 0, taxAmount: 0, total: 0 }
  ]);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sale_price, sku, unit, status, gst_rate')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addItem = () => {
    const newItem: OrderItem = {
      id: Date.now().toString(),
      product_id: "",
      productName: "",
      quantity: 1,
      unitPrice: 0,
      gstRate: 0,
      taxAmount: 0,
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
        
        // If product is selected, update name, price, and GST rate
        if (field === 'product_id' && value) {
          const product = products.find(p => p.id === value);
          if (product) {
            updatedItem.productName = product.name;
            updatedItem.unitPrice = product.sale_price;
            updatedItem.gstRate = product.gst_rate || 0;
            
            // Calculate amounts
            const subtotal = updatedItem.quantity * product.sale_price;
            updatedItem.taxAmount = (subtotal * updatedItem.gstRate) / 100;
            updatedItem.total = subtotal + updatedItem.taxAmount;
          }
        }
        
        if (field === 'quantity' || field === 'unitPrice') {
          const subtotal = updatedItem.quantity * updatedItem.unitPrice;
          updatedItem.taxAmount = (subtotal * updatedItem.gstRate) / 100;
          updatedItem.total = subtotal + updatedItem.taxAmount;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const total = subtotal + taxAmount;

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone?.includes(customerSearch)
  );

  const handleSave = async (status: 'pending' | 'confirmed' = 'pending') => {
    try {
      setIsLoading(true);

      // Validation
      if (!orderData.customer_id) {
        toast({
          title: "Error",
          description: "Please select a customer",
          variant: "destructive",
        });
        return;
      }

      const validItems = items.filter(item => item.product_id && item.quantity > 0);
      if (validItems.length === 0) {
        toast({
          title: "Error", 
          description: "Please add at least one valid item",
          variant: "destructive",
        });
        return;
      }

      // Insert sale order
      const { data: orderData_, error: orderError } = await supabase
        .from('sales_orders')
        .insert({
          customer_id: orderData.customer_id,
          order_number: orderNumber,
          order_date: orderData.order_date,
          delivery_date: orderData.delivery_date || null,
          subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          notes: orderData.notes,
          status
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      const itemsToInsert = validItems.map(item => ({
        sales_order_id: orderData_.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.total
      }));

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: status === 'pending' ? "Order Saved" : "Order Confirmed",
        description: status === 'pending' 
          ? "Sale order has been saved as draft" 
          : "Sale order has been confirmed",
      });

      onSuccess?.(orderData_.id);
      onClose();
    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        title: "Error",
        description: "Failed to save order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewCustomerSuccess = () => {
    setShowNewCustomerForm(false);
    fetchCustomers();
  };

  return (
    <>
      <Dialog open={showNewCustomerForm} onOpenChange={setShowNewCustomerForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm onClose={() => setShowNewCustomerForm(false)} onSuccess={handleNewCustomerSuccess} />
        </DialogContent>
      </Dialog>

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
            <Button 
              variant="outline" 
              onClick={() => handleSave('pending')}
              disabled={isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button 
              className="bg-gradient-primary hover:bg-gradient-primary/90" 
              onClick={() => handleSave('confirmed')}
              disabled={isLoading}
            >
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
                <Label htmlFor="customer">Select Customer</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowNewCustomerForm(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New
                  </Button>
                </div>
                
                {customerSearch && (
                  <div className="mt-2 max-h-32 overflow-y-auto border rounded-md">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="p-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          setOrderData({...orderData, customer_id: customer.id});
                          setCustomerSearch(customer.name);
                        }}
                      >
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {customer.email} • {customer.phone}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  value={orderNumber}
                  disabled
                  placeholder="SO-001"
                />
              </div>
              <div>
                <Label htmlFor="orderDate">Order Date</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={orderData.order_date}
                  onChange={(e) => setOrderData({...orderData, order_date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="deliveryDate">Expected Delivery</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={orderData.delivery_date}
                  onChange={(e) => setOrderData({...orderData, delivery_date: e.target.value})}
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
                <div className="col-span-4">
                  <Label>Product</Label>
                  <Select
                    value={item.product_id}
                    onValueChange={(value) => updateItem(item.id, 'product_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - ₹{product.sale_price} ({product.gst_rate}% GST)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <div className="col-span-1">
                  <Label>GST%</Label>
                  <Input
                    value={`${item.gstRate}%`}
                    disabled
                    className="text-center"
                  />
                </div>
                <div className="col-span-1">
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
              <span>Total Tax:</span>
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
    </>
  );
}
