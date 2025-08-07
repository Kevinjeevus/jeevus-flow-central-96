import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, ShoppingCart, FileText, Eye, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SaleOrderForm } from "@/components/SaleOrderForm";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SaleOrder {
  id: string;
  order_number: string;
  order_date: string;
  delivery_date?: string;
  total_amount: number;
  status: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
}

export default function SaleOrder() {
  const { toast } = useToast();
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [convertingOrderId, setConvertingOrderId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<SaleOrder | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customer:customers(name, email, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const convertToInvoice = async (orderId: string) => {
    try {
      setConvertingOrderId(orderId);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        });
        return;
      }
      
      // Get order details with items
      const { data: orderData, error: orderError } = await supabase
        .from('sales_orders')
        .select(`
          *,
          sales_order_items(*)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Create invoice from order
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('sales_invoices')
        .insert({
          customer_id: orderData.customer_id,
          user_id: user.id,
          invoice_number: `INV-${Date.now()}`, // This should use invoice number generation
          invoice_date: new Date().toISOString().split('T')[0],
          subtotal: orderData.subtotal,
          tax_amount: orderData.tax_amount,
          total_amount: orderData.total_amount,
          notes: `Converted from Sale Order: ${orderData.order_number}`,
          status: 'draft'
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItems = orderData.sales_order_items.map((item: any) => ({
        sales_invoice_id: invoiceData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }));

      const { error: itemsError } = await supabase
        .from('sales_invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Update order status
      await supabase
        .from('sales_orders')
        .update({ status: 'converted' })
        .eq('id', orderId);

      toast({
        title: "Order Converted",
        description: "Sale order has been converted to invoice successfully",
      });

      fetchOrders();
    } catch (error) {
      console.error('Error converting order:', error);
      toast({
        title: "Error",
        description: "Failed to convert order to invoice",
        variant: "destructive",
      });
    } finally {
      setConvertingOrderId(null);
    }
  };

  const handleOrderSuccess = () => {
    setShowOrderForm(false);
    setEditingOrder(null);
    fetchOrders();
  };

  const handleEdit = (order: SaleOrder) => {
    setEditingOrder(order);
    setShowOrderForm(true);
  };

  const handleDelete = async (orderId: string) => {
    try {
      setDeletingOrderId(orderId);
      
      // Delete order items first
      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .delete()
        .eq('sales_order_id', orderId);

      if (itemsError) throw itemsError;

      // Delete the order
      const { error: orderError } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', orderId);

      if (orderError) throw orderError;

      toast({
        title: "Order Deleted",
        description: "Sale order has been deleted successfully",
      });

      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    } finally {
      setDeletingOrderId(null);
    }
  };

  const filteredOrders = orders.filter(order =>
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'converted': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (showOrderForm) {
    return <SaleOrderForm 
      onClose={() => {
        setShowOrderForm(false);
        setEditingOrder(null);
      }} 
      onSuccess={handleOrderSuccess}
      editOrder={editingOrder}
    />;
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-full">
      {/* Header Section */}
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">Sale Order</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage customer orders and sales</p>
          </div>
          <Button 
            className="bg-gradient-primary hover:bg-gradient-primary/90 w-full sm:w-auto shrink-0"
            onClick={() => setShowOrderForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden xs:inline">Create Order</span>
            <span className="xs:hidden">Create</span>
          </Button>
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Search orders..." 
              className="pl-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="w-full sm:w-auto shrink-0">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Orders Card */}
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" />
            Sales Orders
          </CardTitle>
          <CardDescription className="text-sm">
            Track and process customer orders efficiently
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {isLoading ? (
            <div className="text-center py-8 px-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 px-4 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-base">No sale orders found</p>
              <p className="text-sm mt-1">Create your first sale order to get started</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3 p-4">
                {filteredOrders.map((order) => (
                  <Card key={order.id} className="border border-border">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{order.order_number}</h3>
                          <p className="text-sm text-muted-foreground mt-1 truncate">{order.customer.name}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <Badge className={`${getStatusColor(order.status)} text-xs px-2 py-1`}>
                            {order.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(order)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Edit Order
                              </DropdownMenuItem>
                              {order.status !== 'converted' && (
                                <DropdownMenuItem
                                  onClick={() => convertToInvoice(order.id)}
                                  disabled={convertingOrderId === order.id}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Convert to Invoice
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDelete(order.id)}
                                disabled={deletingOrderId === order.id}
                                className="text-destructive"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Delete Order
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground block">Order Date</span>
                          <span className="font-medium">{new Date(order.order_date).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Amount</span>
                          <span className="font-medium">₹{order.total_amount.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Delivery Date</span>
                          <span className="font-medium">
                            {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Contact</span>
                          <span className="font-medium text-xs truncate">
                            {order.customer.email || order.customer.phone || '-'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Order Number</TableHead>
                      <TableHead className="min-w-[150px]">Customer</TableHead>
                      <TableHead className="min-w-[100px]">Order Date</TableHead>
                      <TableHead className="min-w-[100px]">Delivery Date</TableHead>
                      <TableHead className="min-w-[100px]">Amount</TableHead>
                      <TableHead className="min-w-[80px]">Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.customer.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {order.customer.email || order.customer.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>₹{order.total_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(order)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Edit Order
                              </DropdownMenuItem>
                              {order.status !== 'converted' && (
                                <DropdownMenuItem
                                  onClick={() => convertToInvoice(order.id)}
                                  disabled={convertingOrderId === order.id}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Convert to Invoice
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDelete(order.id)}
                                disabled={deletingOrderId === order.id}
                                className="text-destructive"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Delete Order
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}