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
  editOrder?: any;
}

export function SaleOrderForm({ onClose, onSuccess, editOrder }: SaleOrderFormProps) {
  const { toast } = useToast();
  const { orderNumber, isLoading: orderNumberLoading } = useSaleOrderNumber();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

  const [orderData, setOrderData] = useState({
    customer_id: editOrder?.customer_id || "",
    order_date: editOrder?.order_date || new Date().toISOString().split('T')[0],
    delivery_date: editOrder?.delivery_date || "",
    notes: editOrder?.notes || "",
    status: editOrder?.status || 'pending',
    order_number: editOrder?.order_number || ""
  });

  const [isManual, setIsManual] = useState(!!editOrder);

  const [items, setItems] = useState<OrderItem[]>([
    { id: "1", product_id: "", productName: "", quantity: 1, unitPrice: 0, gstRate: 0, taxAmount: 0, total: 0 }
  ]);

  useEffect(() => {
    if (orderNumber && !editOrder && !isManual) {
      setOrderData(prev => ({ ...prev, order_number: orderNumber }));
    }
  }, [orderNumber, editOrder, isManual]);

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

      let orderData_;
      
      if (editOrder) {
        // Update existing order
        const { data: updatedOrder, error: orderError } = await supabase
          .from('sales_orders')
          .update({
            customer_id: orderData.customer_id,
            order_date: orderData.order_date,
            delivery_date: orderData.delivery_date || null,
            subtotal,
            tax_amount: taxAmount,
            total_amount: total,
            order_number: orderData.order_number,
            notes: orderData.notes,
            status
          })
          .eq('id', editOrder.id)
          .select()
          .maybeSingle();

        if (orderError) throw orderError;
        if (!updatedOrder) throw new Error("Order not found or could not be updated");
        orderData_ = updatedOrder;

        // Delete existing items
        await supabase
          .from('sales_order_items')
          .delete()
          .eq('sales_order_id', editOrder.id);
      } else {
        // Insert new sale order
        const { data: newOrder, error: orderError } = await supabase
          .from('sales_orders')
          .insert({
            customer_id: orderData.customer_id,
            order_number: orderData.order_number || orderNumber,
            order_date: orderData.order_date,
            delivery_date: orderData.delivery_date || null,
            subtotal,
            tax_amount: taxAmount,
            total_amount: total,
            notes: orderData.notes,
            status
          })
          .select()
          .maybeSingle();

        if (orderError) throw orderError;
        if (!newOrder) throw new Error("Failed to create order record");
        orderData_ = newOrder;
      }

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
        title: editOrder 
          ? (status === 'pending' ? "Order Updated" : "Order Confirmed")
          : (status === 'pending' ? "Order Saved" : "Order Confirmed"),
        description: editOrder
          ? "Sale order has been updated successfully"
          : (status === 'pending' 
            ? "Sale order has been saved as draft" 
            : "Sale order has been confirmed"),
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

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">
              {editOrder ? "Edit Sale Order" : "Create Sale Order"}
            </h2>
            <p className="text-muted-foreground">
              {editOrder ? "Update customer order details" : "Create a new customer order"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleSave('pending')}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button 
              className="bg-gradient-primary hover:bg-gradient-primary/90 w-full sm:w-auto" 
              onClick={() => handleSave('confirmed')}
              disabled={isLoading}
            >
              <Send className="h-4 w-4 mr-2" />
              Confirm Order
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
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
                <div className="flex gap-2">
                  <Input
                    id="orderNumber"
                    value={orderData.order_number}
                    onChange={(e) => {
                      setOrderData({...orderData, order_number: e.target.value});
                      setIsManual(true);
                    }}
                    placeholder="SO-001"
                    className="flex-1"
                  />
                  {!editOrder && (
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        setIsManual(false);
                        setOrderData({...orderData, order_number: orderNumber});
                      }}
                      title="Reset to auto-generated number"
                    >
                      <Plus className="h-4 w-4 rotate-45" />
                    </Button>
                  )}
                </div>
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
              <div key={item.id} className="space-y-4 p-4 border rounded-lg md:space-y-0 md:grid md:grid-cols-12 md:gap-4 md:items-end md:p-0 md:border-0 md:rounded-none">
                <div className="md:col-span-4">
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
                          <span className="block md:hidden">{product.name}</span>
                          <span className="hidden md:block">{product.name} - ₹{product.sale_price} ({product.gst_rate}% GST)</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2 md:col-span-2 md:grid-cols-1">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                    min="1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 md:col-span-2 md:grid-cols-1">
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    step="0.01"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 md:col-span-1 md:grid-cols-1">
                  <Label>GST%</Label>
                  <Input
                    value={`${item.gstRate}%`}
                    disabled
                    className="text-center"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 md:col-span-1 md:grid-cols-1">
                  <Label>Total</Label>
                  <Input
                    value={`₹${item.total.toFixed(2)}`}
                    disabled
                  />
                </div>
                <div className="flex justify-end md:col-span-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className="w-full md:w-auto"
                  >
                    <Trash2 className="h-4 w-4 md:mr-0" />
                    <span className="ml-2 md:hidden">Remove</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
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
