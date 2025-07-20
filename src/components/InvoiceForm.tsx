import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { CustomerForm } from "@/components/CustomerForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useInvoiceNumber } from "@/hooks/useInvoiceNumber";

interface InvoiceItem {
  id: string;
  product_id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Product {
  id: string;
  name: string;
  sale_price: number;
  sku: string;
}

interface InvoiceFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function InvoiceForm({ onClose, onSuccess }: InvoiceFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { invoiceNumber } = useInvoiceNumber();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cheques, setCheques] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  
  const [invoiceData, setInvoiceData] = useState({
    customer_id: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: "",
    notes: "",
    taxRate: 18,
    payment_method: "cash",
    payment_account_id: "",
    cheque_id: ""
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "1", product_id: "", productName: "", quantity: 1, unitPrice: 0, total: 0 }
  ]);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchAccounts();
    fetchCheques();
    checkActiveSession();
  }, [user]);

  useEffect(() => {
    if (invoiceNumber) {
      setInvoiceData(prev => ({
        ...prev,
        invoiceNumber: invoiceNumber
      }));
    }
  }, [invoiceNumber]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sale_price, sku')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, account_name, account_type, current_balance')
        .eq('account_type', 'assets')
        .eq('is_active', true)
        .order('account_name');
      
      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchCheques = async () => {
    try {
      const { data, error } = await supabase
        .from('cheques')
        .select('id, cheque_number, bank_name, amount, status')
        .eq('status', 'pending')
        .order('cheque_date', { ascending: false });
      
      if (error) throw error;
      setCheques(data || []);
    } catch (error: any) {
      console.error('Error fetching cheques:', error);
    }
  };

  const checkActiveSession = async () => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('id, route_id')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setActiveSession(data);
    } catch (error: any) {
      console.error('Error checking active session:', error);
    }
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      product_id: "",
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

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // If product is selected, update name and price
        if (field === 'product_id') {
          const selectedProduct = products.find(p => p.id === value);
          if (selectedProduct) {
            updatedItem.productName = selectedProduct.name;
            updatedItem.unitPrice = selectedProduct.sale_price;
          }
        }
        
        if (field === 'quantity' || field === 'unitPrice' || field === 'product_id') {
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = (subtotal * invoiceData.taxRate) / 100;
  const total = subtotal + taxAmount;

  const handleSave = async (status: 'draft' | 'sent' = 'draft') => {
    if (!invoiceData.customer_id) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    if (!activeSession) {
      toast({
        title: "Error",
        description: "No active session found. Please mark attendance first.",
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

    setIsLoading(true);
    try {
      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('sales_invoices')
        .insert({
          customer_id: invoiceData.customer_id,
          user_id: user?.id,
          route_id: activeSession.route_id,
          session_id: activeSession.id,
          invoice_number: invoiceData.invoiceNumber,
          invoice_date: invoiceData.invoiceDate,
          due_date: invoiceData.dueDate || null,
          subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          notes: invoiceData.notes,
          payment_method: invoiceData.payment_method,
          payment_account_id: invoiceData.payment_account_id || null,
          cheque_id: invoiceData.cheque_id || null,
          status
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItems = validItems.map(item => ({
        sales_invoice_id: invoice.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.total
      }));

      const { error: itemsError } = await supabase
        .from('sales_invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: `Invoice ${status === 'draft' ? 'saved as draft' : 'created and sent'}`,
      });
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save invoice",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <>
      <Dialog open={showNewCustomerForm} onOpenChange={setShowNewCustomerForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm 
            onClose={() => setShowNewCustomerForm(false)}
            onSuccess={(newCustomer) => {
              if (newCustomer) {
                setCustomers([...customers, newCustomer]);
                setInvoiceData({...invoiceData, customer_id: newCustomer.id});
              }
              setShowNewCustomerForm(false);
              setNewCustomerName("");
            }}
            initialName={newCustomerName}
          />
        </DialogContent>
      </Dialog>
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Create Invoice</h2>
          <p className="text-muted-foreground">Create a new sales invoice</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => handleSave('draft')} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Saving..." : "Save Draft"}
          </Button>
          <Button className="bg-gradient-primary hover:bg-gradient-primary/90" onClick={() => handleSave('sent')} disabled={isLoading}>
            <Send className="h-4 w-4 mr-2" />
            {isLoading ? "Creating..." : "Create Invoice"}
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
              <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerSearchOpen}
                    className="w-full justify-between"
                  >
                    {invoiceData.customer_id
                      ? customers.find((customer) => customer.id === invoiceData.customer_id)?.name
                      : "Search customers..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search customers..." 
                      value={customerSearch}
                      onValueChange={(value) => {
                        setCustomerSearch(value);
                        setNewCustomerName(value);
                      }}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="py-2">
                          <p className="text-sm text-muted-foreground mb-2">No customer found.</p>
                          <Button
                            size="sm"
                            onClick={() => {
                              setShowNewCustomerForm(true);
                              setCustomerSearchOpen(false);
                            }}
                            className="w-full"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Create "{customerSearch || newCustomerName}"
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {customers
                          .filter((customer) =>
                            customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                            customer.email?.toLowerCase().includes(customerSearch.toLowerCase())
                          )
                          .map((customer) => (
                            <CommandItem
                              key={customer.id}
                              onSelect={() => {
                                setInvoiceData({...invoiceData, customer_id: customer.id});
                                setCustomerSearchOpen(false);
                                setCustomerSearch("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  invoiceData.customer_id === customer.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div>
                                <div className="font-medium">{customer.name}</div>
                                <div className="text-sm text-muted-foreground">{customer.email}</div>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {activeSession && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">
                  📍 Active Route Session - Invoice will be linked to current route
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={invoiceData.invoiceNumber}
                onChange={(e) => setInvoiceData({...invoiceData, invoiceNumber: e.target.value})}
                placeholder="INV-001"
              />
            </div>
            <div>
              <Label htmlFor="invoiceDate">Invoice Date</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceData.invoiceDate}
                onChange={(e) => setInvoiceData({...invoiceData, invoiceDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={invoiceData.dueDate}
                onChange={(e) => setInvoiceData({...invoiceData, dueDate: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Items</CardTitle>
          <CardDescription>Add products or services to this invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-5">
                  <Label>Product/Service</Label>
                  <Select value={item.product_id} onValueChange={(value) => updateItem(item.id, 'product_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">₹{product.sale_price} - {product.sku}</div>
                          </div>
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
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select value={invoiceData.payment_method} onValueChange={(value) => setInvoiceData({...invoiceData, payment_method: value, payment_account_id: "", cheque_id: ""})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash in Hand</SelectItem>
                  <SelectItem value="bank">Bank Account</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {invoiceData.payment_method === 'bank' && (
              <div>
                <Label htmlFor="payment_account">Bank Account</Label>
                <Select value={invoiceData.payment_account_id} onValueChange={(value) => setInvoiceData({...invoiceData, payment_account_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter(acc => acc.account_name.toLowerCase().includes('bank')).map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div>
                          <div className="font-medium">{account.account_name}</div>
                          <div className="text-sm text-muted-foreground">Balance: ₹{account.current_balance?.toLocaleString()}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {invoiceData.payment_method === 'cash' && (
              <div>
                <Label htmlFor="cash_account">Cash Account</Label>
                <Select value={invoiceData.payment_account_id} onValueChange={(value) => setInvoiceData({...invoiceData, payment_account_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cash account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter(acc => acc.account_name.toLowerCase().includes('cash')).map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div>
                          <div className="font-medium">{account.account_name}</div>
                          <div className="text-sm text-muted-foreground">Balance: ₹{account.current_balance?.toLocaleString()}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {invoiceData.payment_method === 'cheque' && (
              <div>
                <Label htmlFor="cheque">Cheque</Label>
                <Select value={invoiceData.cheque_id} onValueChange={(value) => setInvoiceData({...invoiceData, cheque_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cheque" />
                  </SelectTrigger>
                  <SelectContent>
                    {cheques.map((cheque) => (
                      <SelectItem key={cheque.id} value={cheque.id}>
                        <div>
                          <div className="font-medium">Cheque #{cheque.cheque_number}</div>
                          <div className="text-sm text-muted-foreground">{cheque.bank_name} - ₹{cheque.amount?.toLocaleString()}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData({...invoiceData, notes: e.target.value})}
                placeholder="Add any notes or terms for this invoice"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({invoiceData.taxRate}%):</span>
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