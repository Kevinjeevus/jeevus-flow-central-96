import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { FileText, Plus, Search, Eye, Users, Edit, Share, Trash2, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoiceForm } from "@/components/InvoiceForm";
import { InvoicePreview } from "@/components/InvoicePreview";
import { CustomerForm } from "@/components/CustomerForm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { ErpLayout } from "@/components/ErpLayout";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  status: string;
  customer: {
    name: string;
    phone: string;
  };
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  status: string;
}

export default function SaleInvoices() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"invoices" | "customers">("invoices");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/employee-auth" replace />;
  }

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
  }, [user]);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchQuery, statusFilter]);

  useEffect(() => {
    filterCustomers();
  }, [customers, customerSearchQuery]);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("sales_invoices")
        .select(`
          id,
          invoice_number,
          invoice_date,
          total_amount,
          status,
          customers (
            name,
            phone
          )
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Transform data to match Invoice interface
      const transformedData = data?.map((invoice: any) => ({
        ...invoice,
        customer: invoice.customers
      })) || [];
      setInvoices(transformedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, email, city, status")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      });
    }
  };

  const filterInvoices = () => {
    let filtered = invoices;

    if (searchQuery) {
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          invoice.customer?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((invoice) => invoice.status === statusFilter);
    }

    setFilteredInvoices(filtered);
  };

  const filterCustomers = () => {
    let filtered = customers;

    if (customerSearchQuery) {
      filtered = filtered.filter(
        (customer) =>
          customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
          customer.phone?.includes(customerSearchQuery) ||
          customer.email?.toLowerCase().includes(customerSearchQuery.toLowerCase())
      );
    }

    setFilteredCustomers(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      draft: "secondary",
      sent: "default",
      paid: "default",
      overdue: "destructive",
    };
    return (
      <Badge variant={statusColors[status] || "secondary"}>
        {status}
      </Badge>
    );
  };

  const handleViewInvoice = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select(`
          *,
          customers (name, email, phone, address),
          sales_invoice_items (
            *, 
            products (name)
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (error) throw error;

      // Format data for preview
      const invoiceForPreview = {
        id: data.id,
        invoice_number: data.invoice_number,
        invoice_date: data.invoice_date,
        customer: {
          name: data.customers.name,
          email: data.customers.email,
          phone: data.customers.phone,
          address: data.customers.address
        },
        items: data.sales_invoice_items.map((item: any) => ({
          product_name: item.products.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        })),
        subtotal: data.subtotal,
        tax_amount: data.tax_amount,
        total_amount: data.total_amount,
        notes: data.notes
      };

      setSelectedInvoice(invoiceForPreview);
      setShowInvoicePreview(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load invoice",
        variant: "destructive",
      });
    }
  };

  const handleShareInvoice = async (invoice: Invoice) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Invoice ${invoice.invoice_number}`,
          text: `Invoice for ₹${invoice.total_amount.toFixed(2)} from JEEVUS NATURALS\nCustomer: ${invoice.customer.name}`,
          url: window.location.href
        });
      } else {
        const shareText = `Invoice ${invoice.invoice_number}\nAmount: ₹${invoice.total_amount.toFixed(2)}\nCustomer: ${invoice.customer.name}`;
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied to Clipboard",
          description: "Invoice details copied to clipboard",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share invoice",
        variant: "destructive",
      });
    }
  };

  return (
    <ErpLayout>
      {/* Invoice Preview Dialog */}
      {selectedInvoice && (
        <InvoicePreview
          isOpen={showInvoicePreview}
          onClose={() => {
            setShowInvoicePreview(false);
            setSelectedInvoice(null);
          }}
          invoiceData={selectedInvoice}
          onRefresh={fetchInvoices}
        />
      )}
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Sales Management</h1>
            <p className="text-muted-foreground">Manage invoices and customers</p>
          </div>

          {/* Mobile Tab Switcher */}
          <div className="grid grid-cols-2 bg-muted rounded-lg p-1 md:hidden">
            <Button
              variant={activeTab === "invoices" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("invoices")}
              className="rounded-md"
            >
              <FileText className="h-4 w-4 mr-2" />
              Invoices
            </Button>
            <Button
              variant={activeTab === "customers" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("customers")}
              className="rounded-md"
            >
              <Users className="h-4 w-4 mr-2" />
              Customers
            </Button>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-2 gap-6">
          {/* Invoices Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Invoices
                  </CardTitle>
                  <CardDescription>Manage your sales invoices</CardDescription>
                </div>
                <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New Invoice
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <InvoiceForm
                      onSuccess={() => {
                        setIsInvoiceDialogOpen(false);
                        fetchInvoices();
                      }}
                      onClose={() => setIsInvoiceDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Invoices List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 flex-1">
                        <div className="font-medium">{invoice.invoice_number}</div>
                        <div className="text-sm text-muted-foreground">
                          {invoice.customer?.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(invoice.invoice_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-medium">₹{invoice.total_amount.toLocaleString()}</div>
                        {getStatusBadge(invoice.status)}
                        <div className="flex gap-1 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewInvoice(invoice.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleShareInvoice(invoice)}>
                                <Share className="h-4 w-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredInvoices.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No invoices found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customers Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Customers
                  </CardTitle>
                  <CardDescription>Manage your customers</CardDescription>
                </div>
                <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New Customer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <CustomerForm
                      onSuccess={() => {
                        setIsCustomerDialogOpen(false);
                        fetchCustomers();
                      }}
                      onClose={() => setIsCustomerDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Customers List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground">{customer.phone}</div>
                      <div className="text-sm text-muted-foreground">{customer.email}</div>
                      {customer.city && (
                        <div className="text-sm text-muted-foreground">{customer.city}</div>
                      )}
                    </div>
                  </div>
                ))}
                {filteredCustomers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No customers found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          {activeTab === "invoices" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Invoices
                  </CardTitle>
                  <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
                      <InvoiceForm
                        onSuccess={() => {
                          setIsInvoiceDialogOpen(false);
                          fetchInvoices();
                        }}
                        onClose={() => setIsInvoiceDialogOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search invoices..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Invoices List */}
                <div className="space-y-3">
                  {filteredInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="p-4 border rounded-lg bg-card"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">{invoice.invoice_number}</div>
                        <div className="font-medium">₹{invoice.total_amount.toLocaleString()}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">
                          Customer: {invoice.customer?.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Date: {new Date(invoice.invoice_date).toLocaleDateString()}
                        </div>
                         <div className="flex justify-between items-center">
                           <div>{getStatusBadge(invoice.status)}</div>
                           <div className="flex gap-1">
                             <Button 
                               variant="ghost" 
                               size="sm"
                               onClick={() => handleViewInvoice(invoice.id)}
                             >
                               <Eye className="h-4 w-4" />
                             </Button>
                             <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" size="sm">
                                   <MoreHorizontal className="h-4 w-4" />
                                 </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent align="end">
                                 <DropdownMenuItem onClick={() => handleShareInvoice(invoice)}>
                                   <Share className="h-4 w-4 mr-2" />
                                   Share
                                 </DropdownMenuItem>
                               </DropdownMenuContent>
                             </DropdownMenu>
                           </div>
                         </div>
                      </div>
                    </div>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No invoices found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "customers" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Customers
                  </CardTitle>
                  <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
                      <CustomerForm
                        onSuccess={() => {
                          setIsCustomerDialogOpen(false);
                          fetchCustomers();
                        }}
                        onClose={() => setIsCustomerDialogOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Customers List */}
                <div className="space-y-3">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="p-4 border rounded-lg bg-card"
                    >
                      <div className="space-y-2">
                        <div className="font-medium">{customer.name}</div>
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            📞 {customer.phone}
                          </div>
                          {customer.email && (
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              ✉️ {customer.email}
                            </div>
                          )}
                          {customer.city && (
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              📍 {customer.city}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No customers found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ErpLayout>
  );
}