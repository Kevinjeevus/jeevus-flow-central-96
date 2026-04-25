import { useState, useEffect } from "react";
import { Search, ShoppingCart, Plus, Minus, Trash2, User, CreditCard, FileText, Package, X, Edit, Eye, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSaleOrderNumber } from "@/hooks/useSaleOrderNumber";
import { useInvoiceNumber } from "@/hooks/useInvoiceNumber";
import { CustomerForm } from "@/components/CustomerForm";
import { useAuth } from "@/components/auth/AuthProvider";
import { InvoicePreview } from "@/components/InvoicePreview";

interface Product {
  id: string;
  name: string;
  sku: string;
  sale_price: number;
  stock_quantity: number;
  unit: string;
  gst_rate: number;
  description?: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  city?: string;
  state?: string;
  address?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface SalesOrder {
  id: string;
  order_number: string;
  order_date: string;
  total_amount: number;
  status: string;
  customer: Customer;
  notes?: string;
}

interface SalesInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  status: string;
  payment_method?: string;
  customer: Customer;
  notes?: string;
}

interface Account {
  id: string;
  account_name: string;
  account_type: string;
}

export default function KevinSalesOrder() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<SalesInvoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<SalesInvoice | null>(null);
  const [viewingOrder, setViewingOrder] = useState<SalesOrder | null>(null);
  const [fullInvoiceData, setFullInvoiceData] = useState<any>(null);
  const [showFullInvoicePreview, setShowFullInvoicePreview] = useState(false);
  
  const { toast } = useToast();
  const { orderNumber, isLoading: orderNumberLoading } = useSaleOrderNumber();
  const { invoiceNumber, isLoading: invoiceNumberLoading, regenerateNumber: regenerateInvoiceNumber } = useInvoiceNumber();
  const [customInvoiceNumber, setCustomInvoiceNumber] = useState("");
  const [isManualInvoice, setIsManualInvoice] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (invoiceNumber && !isManualInvoice) {
      setCustomInvoiceNumber(invoiceNumber);
    }
  }, [invoiceNumber, isManualInvoice]);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchAccounts();
    fetchSalesOrders();
    fetchSalesInvoices();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Failed to load customers:", error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("is_active", true)
        .order("account_name");

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Failed to load accounts:", error);
    }
  };

  const fetchSalesOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("sales_orders")
        .select(`
          *,
          customer:customers(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSalesOrders(data || []);
    } catch (error) {
      console.error("Failed to load sales orders:", error);
    }
  };

  const fetchSalesInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("sales_invoices")
        .select(`
          *,
          customer:customers(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSalesInvoices(data || []);
    } catch (error) {
      console.error("Failed to load sales invoices:", error);
    }
  };

  const fetchFullInvoiceData = async (invoiceId: string) => {
    try {
      const { data: rawInvoiceData, error: invoiceError } = await supabase
        .from("sales_invoices")
        .select(`
          *,
          customers (name, email, phone, address, gstin),
          sales_invoice_items (
            *, 
            products (name)
          )
        `)
        .eq("id", invoiceId)
        .limit(1);

      if (invoiceError) throw invoiceError;
      if (!rawInvoiceData || rawInvoiceData.length === 0) {
        toast({
          title: "Error",
          description: "Invoice not found",
          variant: "destructive",
        });
        return;
      }
      const invoiceData = rawInvoiceData[0];

      // Fetch payment account details if available
      let bankAccount = null;
      if (invoiceData.payment_account_id) {
        const { data: accountData } = await supabase
          .from("accounts")
          .select("*")
          .eq("id", invoiceData.payment_account_id)
          .maybeSingle();
        
        if (accountData) {
          bankAccount = {
            account_name: accountData.account_name,
            account_number: accountData.account_number || '',
            bank_name: accountData.bank_name || '',
            ifsc_code: accountData.ifsc_code || '',
            account_holder_name: accountData.account_holder_name || ''
          };
        }
      }

      // Transform data to match InvoiceData interface
      const transformedData = {
        id: invoiceData.id,
        invoice_number: invoiceData.invoice_number,
        invoice_date: invoiceData.invoice_date,
        payment_method: invoiceData.payment_method,
        customer: {
          name: invoiceData.customer.name,
          email: invoiceData.customer.email || '',
          phone: invoiceData.customer.phone || '',
          address: invoiceData.customer.address || '',
          gstin: invoiceData.customer.gstin || ''
        },
        items: invoiceData.sales_invoice_items.map((item: any) => ({
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          hsn_code: item.product.hsn_code || '',
          gst_rate: item.product.gst_rate || 18,
          unit: item.product.unit || 'Nos'
        })),
        subtotal: invoiceData.subtotal,
        tax_amount: invoiceData.tax_amount,
        total_amount: invoiceData.total_amount,
        notes: invoiceData.notes,
        bank_account: bankAccount
      };

      setFullInvoiceData(transformedData);
      setShowFullInvoicePreview(true);
    } catch (error) {
      console.error("Failed to fetch full invoice data:", error);
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive"
      });
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const calculateCartTotal = () => {
    const subtotal = cart.reduce((total, item) => total + (item.product.sale_price * item.quantity), 0);
    const tax = cart.reduce((total, item) => {
      const itemTotal = item.product.sale_price * item.quantity;
      return total + (itemTotal * (item.product.gst_rate / 100));
    }, 0);
    
    return { subtotal, tax, total: subtotal + tax };
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.company?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );

  const handlePlaceOrder = async () => {
    if (!selectedCustomer) {
      toast({
        title: "Customer Required",
        description: "Please select a customer before placing the order",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to the cart before placing the order",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { subtotal, tax, total } = calculateCartTotal();

      const { data: orderData, error: orderError } = await supabase
        .from("sales_orders")
        .insert({
          customer_id: selectedCustomer.id,
          order_number: orderNumber,
          subtotal,
          tax_amount: tax,
          total_amount: total,
          status: "confirmed",
          notes,
          created_by: user?.id,
        })
        .select();

      if (orderError) throw orderError;
      if (!orderData || orderData.length === 0) throw new Error("Failed to create order record");
      const order = orderData[0];

      const orderItems = cart.map(item => ({
        sales_order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.sale_price,
        total_price: item.product.sale_price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("sales_order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Order Placed",
        description: `Sales order ${orderNumber} has been placed successfully`,
      });

      // Reset form and refresh orders
      setCart([]);
      setSelectedCustomer(null);
      setNotes("");
      fetchSalesOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateInvoice = async () => {
    if (!editingInvoice) return;
    
    try {
      setSubmitting(true);
      const { data, error } = await supabase
        .from("sales_invoices")
        .update({
          invoice_number: editingInvoice.invoice_number,
          payment_method: editingInvoice.payment_method,
          status: editingInvoice.status,
          notes: editingInvoice.notes,
        })
        .eq("id", editingInvoice.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Invoice not found or you don't have permission to update it");

      toast({
        title: "Invoice Updated",
        description: `Invoice ${editingInvoice.invoice_number} has been updated successfully`,
      });
      setEditingInvoice(null);
      fetchSalesInvoices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedCustomer) {
      toast({
        title: "Customer Required",
        description: "Please select a customer before creating the invoice",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to the cart before creating the invoice",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { subtotal, tax, total } = calculateCartTotal();

      const invoiceData: any = {
        customer_id: selectedCustomer.id,
        invoice_number: isManualInvoice ? customInvoiceNumber : invoiceNumber,
        user_id: user?.id!,
        subtotal,
        tax_amount: tax,
        total_amount: total,
        status: "confirmed",
        notes,
        payment_method: paymentMethod,
        created_by: user?.id,
      };

      if (selectedAccountId) {
        invoiceData.payment_account_id = selectedAccountId;
      }

      const { data: invoiceResult, error: invoiceError } = await supabase
        .from("sales_invoices")
        .insert(invoiceData)
        .select();

      if (invoiceError) throw invoiceError;
      if (!invoiceResult || invoiceResult.length === 0) throw new Error("Failed to create invoice record");
      const invoice = invoiceResult[0];

      const invoiceItems = cart.map(item => ({
        sales_invoice_id: invoice.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.sale_price,
        total_price: item.product.sale_price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("sales_invoice_items")
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Invoice Created",
        description: `Sales invoice ${isManualInvoice ? customInvoiceNumber : invoiceNumber} has been created successfully`,
      });

      // Reset form and refresh invoices
      setCart([]);
      setSelectedCustomer(null);
      setNotes("");
      setPaymentMethod("cash");
      setSelectedAccountId("");
      setIsManualInvoice(false);
      setCustomInvoiceNumber("");
      fetchSalesInvoices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openInvoiceDialog = () => {
    if (!selectedCustomer) {
      toast({
        title: "Customer Required",
        description: "Please select a customer first",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to the cart first",
        variant: "destructive",
      });
      return;
    }

    setShowInvoiceDialog(true);
  };

  const { subtotal, tax, total } = calculateCartTotal();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-8 relative text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="absolute left-0 top-0"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Kevin ERP Sales Center
          </h1>
          <p className="text-muted-foreground">Modern shopping experience for your sales team</p>
        </div>

        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sales">Sales Center</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Products Section */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Product Catalog
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Search products..."
                          className="pl-10"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                      {loading ? (
                        <div className="col-span-full text-center py-8">Loading products...</div>
                      ) : filteredProducts.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-muted-foreground">
                          No products found
                        </div>
                      ) : (
                        filteredProducts.map((product) => (
                          <Card
                            key={product.id}
                            className="hover:shadow-lg transition-shadow border-l-4 border-l-primary/20 hover:border-l-primary"
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-sm">{product.name}</h3>
                                <Badge variant="secondary" className="text-xs">{product.sku}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                                {product.description || "No description available"}
                              </p>
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-bold text-primary">₹{product.sale_price}</p>
                                  <p className="text-xs text-muted-foreground">Stock: {product.stock_quantity}</p>
                                </div>
                                <Button 
                                  size="sm" 
                                  className="bg-gradient-primary hover:opacity-90"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(product);
                                  }}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Cart & Customer Section */}
              <div className="space-y-4">
                {/* Customer Selection */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Customer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedCustomer ? (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{selectedCustomer.name}</p>
                            {selectedCustomer.company && (
                              <p className="text-sm text-muted-foreground">{selectedCustomer.company}</p>
                            )}
                            {selectedCustomer.city && selectedCustomer.state && (
                              <p className="text-sm text-muted-foreground">
                                {selectedCustomer.city}, {selectedCustomer.state}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCustomer(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">
                              Select Customer
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Select Customer</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search customers..."
                                  className="pl-10"
                                  value={customerSearchTerm}
                                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                />
                              </div>
                              <div className="max-h-64 overflow-y-auto space-y-2">
                                {filteredCustomers.map((customer) => (
                                  <div
                                    key={customer.id}
                                    className="p-3 border rounded-lg hover:bg-muted cursor-pointer"
                                    onClick={() => {
                                      setSelectedCustomer(customer);
                                      setShowCustomerDialog(false);
                                      setCustomerSearchTerm("");
                                    }}
                                  >
                                    <p className="font-medium">{customer.name}</p>
                                    {customer.company && (
                                      <p className="text-sm text-muted-foreground">{customer.company}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  setShowCustomerDialog(false);
                                  setShowCustomerForm(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add New Customer
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Shopping Cart */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Cart ({cart.length} items)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cart.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Your cart is empty</p>
                        <p className="text-sm">Click on products to add them</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="max-h-[320px] overflow-y-auto pr-1 space-y-3">
                          {cart.map((item) => (
                            <div key={item.product.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{item.product.name}</p>
                                <p className="text-xs text-muted-foreground">₹{item.product.sale_price} each</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeFromCart(item.product.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Cart Summary */}
                        <div className="border-t pt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span>₹{subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Tax:</span>
                            <span>₹{tax.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Total:</span>
                            <span>₹{total.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                          <Label htmlFor="notes">Notes (optional)</Label>
                          <Textarea
                            id="notes"
                            placeholder="Add any special instructions..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2">
                          <Button
                            className="w-full bg-gradient-primary hover:opacity-90"
                            onClick={handlePlaceOrder}
                            disabled={submitting || orderNumberLoading}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Place Order {orderNumber && `(${orderNumber})`}
                          </Button>
                          <Button
                            className="w-full bg-gradient-primary hover:opacity-90"
                            onClick={openInvoiceDialog}
                            disabled={submitting || cart.length === 0 || !selectedCustomer || invoiceNumberLoading}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                             Create Invoice {customInvoiceNumber && `(${customInvoiceNumber})`}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Sales Orders
                </CardTitle>
                <CardDescription>
                  View and manage all sales orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>{order.customer?.name}</TableCell>
                        <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                        <TableCell>₹{order.total_amount}</TableCell>
                        <TableCell>
                          <Badge variant={order.status === 'confirmed' ? 'default' : 'secondary'}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setViewingOrder(order)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setEditingOrder(order)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Sales Invoices
                </CardTitle>
                <CardDescription>
                  View and manage all sales invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.customer?.name}</TableCell>
                        <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                        <TableCell>₹{invoice.total_amount}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {invoice.payment_method || 'cash'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={invoice.status === 'confirmed' ? 'default' : 'secondary'}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => fetchFullInvoiceData(invoice.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setEditingInvoice(invoice)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Customer Form Dialog */}
        <Dialog open={showCustomerForm} onOpenChange={setShowCustomerForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sr-only">
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <CustomerForm
              onClose={() => setShowCustomerForm(false)}
              onSuccess={(customer) => {
                setCustomers([...customers, customer]);
                setSelectedCustomer(customer);
                setShowCustomerForm(false);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Invoice Creation Dialog */}
        <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
              <DialogDescription>
                Configure payment details for the invoice
              </DialogDescription>
             </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoice-number">Invoice Number</Label>
                <div className="flex gap-2">
                  <Input 
                    id="invoice-number"
                    value={customInvoiceNumber}
                    onChange={(e) => {
                      setCustomInvoiceNumber(e.target.value);
                      setIsManualInvoice(true);
                    }}
                    placeholder="INV/2025/001"
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      setIsManualInvoice(false);
                      setCustomInvoiceNumber(invoiceNumber);
                    }}
                    title="Reset to auto-generated number"
                  >
                    <Plus className="h-4 w-4 rotate-45" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {isManualInvoice ? "Manual entry enabled" : "Auto-generated number"}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(paymentMethod === "bank_transfer" || paymentMethod === "upi") && (
                <div className="space-y-2">
                  <Label>Payment Account</Label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_name} ({account.account_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Tax:</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center font-semibold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowInvoiceDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-primary hover:opacity-90"
                  onClick={() => handleCreateInvoice()}
                  disabled={submitting}
                >
                  Create Invoice
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Order Dialog */}
        <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View Sales Order</DialogTitle>
              <DialogDescription>
                Order details for {viewingOrder?.order_number}
              </DialogDescription>
            </DialogHeader>
            {viewingOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Order Number</Label>
                    <p>{viewingOrder.order_number}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Order Date</Label>
                    <p>{new Date(viewingOrder.order_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Customer</Label>
                    <p>{viewingOrder.customer?.name}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Status</Label>
                    <Badge variant={viewingOrder.status === 'confirmed' ? 'default' : 'secondary'}>
                      {viewingOrder.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="font-semibold">Total Amount</Label>
                    <p className="text-lg font-bold">₹{viewingOrder.total_amount}</p>
                  </div>
                </div>
                {viewingOrder.notes && (
                  <div>
                    <Label className="font-semibold">Notes</Label>
                    <p className="text-sm text-muted-foreground">{viewingOrder.notes}</p>
                  </div>
                )}
                <Button 
                  onClick={() => setViewingOrder(null)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* View Invoice Dialog */}
        <Dialog open={!!viewingInvoice} onOpenChange={() => setViewingInvoice(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View Sales Invoice</DialogTitle>
              <DialogDescription>
                Invoice details for {viewingInvoice?.invoice_number}
              </DialogDescription>
            </DialogHeader>
            {viewingInvoice && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Invoice Number</Label>
                    <p>{viewingInvoice.invoice_number}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Invoice Date</Label>
                    <p>{new Date(viewingInvoice.invoice_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Customer</Label>
                    <p>{viewingInvoice.customer?.name}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Payment Method</Label>
                    <Badge variant="outline">
                      {viewingInvoice.payment_method || 'cash'}
                    </Badge>
                  </div>
                  <div>
                    <Label className="font-semibold">Status</Label>
                    <Badge variant={viewingInvoice.status === 'confirmed' ? 'default' : 'secondary'}>
                      {viewingInvoice.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="font-semibold">Total Amount</Label>
                    <p className="text-lg font-bold">₹{viewingInvoice.total_amount}</p>
                  </div>
                </div>
                {viewingInvoice.notes && (
                  <div>
                    <Label className="font-semibold">Notes</Label>
                    <p className="text-sm text-muted-foreground">{viewingInvoice.notes}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setViewingInvoice(null)}
                    variant="outline"
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button 
                    onClick={() => {
                      setViewingInvoice(null);
                      setEditingInvoice(viewingInvoice);
                    }}
                    className="flex-1"
                  >
                    Edit Invoice
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Invoice Dialog */}
        <Dialog open={!!editingInvoice} onOpenChange={() => setEditingInvoice(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Invoice</DialogTitle>
              <DialogDescription>
                 Update invoice {editingInvoice?.invoice_number}
              </DialogDescription>
            </DialogHeader>
            {editingInvoice && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Invoice Number</Label>
                  <Input 
                    defaultValue={editingInvoice.invoice_number}
                    onChange={(e) => {
                      setEditingInvoice({...editingInvoice, invoice_number: e.target.value});
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select 
                    value={editingInvoice.payment_method || "cash"}
                    onValueChange={(value) => setEditingInvoice({...editingInvoice, payment_method: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={editingInvoice.status}
                    onValueChange={(value) => setEditingInvoice({...editingInvoice, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea 
                    value={editingInvoice.notes || ""}
                    onChange={(e) => setEditingInvoice({...editingInvoice, notes: e.target.value})}
                    placeholder="Add notes..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingInvoice(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1"
                    disabled={submitting}
                    onClick={handleUpdateInvoice}
                  >
                    {submitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Order Dialog */}
        <Dialog open={!!editingOrder} onOpenChange={() => setEditingOrder(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Order</DialogTitle>
              <DialogDescription>
                Update order {editingOrder?.order_number}
              </DialogDescription>
            </DialogHeader>
            {editingOrder && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select defaultValue={editingOrder.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea 
                    defaultValue={editingOrder.notes || ""}
                    placeholder="Add notes..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingOrder(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      toast({
                        title: "Order Updated",
                        description: `Order ${editingOrder.order_number} has been updated`,
                      });
                      setEditingOrder(null);
                      fetchSalesOrders();
                    }}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Full Invoice Preview */}
        {fullInvoiceData && (
          <InvoicePreview
            isOpen={showFullInvoicePreview}
            onClose={() => {
              setShowFullInvoicePreview(false);
              setFullInvoiceData(null);
            }}
            invoiceData={fullInvoiceData}
            onEdit={() => {
              setShowFullInvoicePreview(false);
              // Find the invoice and set it for editing
              const invoice = salesInvoices.find(inv => inv.id === fullInvoiceData.id);
              if (invoice) setEditingInvoice(invoice);
            }}
            onRefresh={fetchSalesInvoices}
          />
        )}
      </div>
    </div>
  );
}