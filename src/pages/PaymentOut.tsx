import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, ArrowUpCircle, Edit, Trash2, Eye, Calendar, DollarSign, Building2, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { PaymentOutForm } from "@/components/PaymentOutForm";

interface PaymentOut {
  id: string;
  payment_number: string;
  supplier_id: string;
  account_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  description: string;
  status: string;
  created_at: string;
  suppliers: {
    name: string;
    company: string;
  };
  accounts: {
    account_name: string;
    account_type: string;
  };
}

export default function PaymentOut() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    totalAmount: 0,
    thisMonth: 0,
    paymentCount: 0
  });

  useEffect(() => {
    fetchPayments();
    calculateStats();
  }, [user]);

  const fetchPayments = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          suppliers (name, company),
          accounts (account_name, account_type)
        `)
        .eq('payment_type', 'out')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch payments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = async () => {
    if (!user) return;
    
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const { data, error } = await supabase
        .from('payments')
        .select('amount, payment_date')
        .eq('payment_type', 'out')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (error) throw error;

      const totalAmount = data?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
      const thisMonth = data?.filter(payment => 
        payment.payment_date.startsWith(currentMonth)
      ).reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;

      setStats({
        totalAmount,
        thisMonth,
        paymentCount: data?.length || 0
      });
    } catch (error: any) {
      console.error('Error calculating stats:', error);
    }
  };

  const handleDelete = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment deleted successfully",
      });
      
      fetchPayments();
      calculateStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete payment",
        variant: "destructive",
      });
    }
  };

  const filteredPayments = payments.filter(payment =>
    payment.payment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.suppliers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.suppliers?.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <DollarSign className="h-4 w-4" />;
      case 'bank_transfer':
      case 'upi':
        return <Building2 className="h-4 w-4" />;
      case 'cheque':
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <PaymentOutForm 
            onClose={() => setShowForm(false)} 
            onSuccess={() => {
              fetchPayments();
              calculateStats();
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payment Out</h1>
            <p className="text-muted-foreground">Manage outgoing payments to suppliers</p>
          </div>
          <Button 
            className="bg-gradient-primary hover:bg-gradient-primary/90"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Payment Out
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Payments</p>
                  <p className="text-2xl font-bold">₹{stats.totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">₹{stats.thisMonth.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Payment Count</p>
                  <p className="text-2xl font-bold">{stats.paymentCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Search payments..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5" />
              Payment Out Records
            </CardTitle>
            <CardDescription>
              Track and manage all outgoing payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p>Loading payments...</p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ArrowUpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No payment out records found</p>
                <p className="text-sm">Create your first payment out to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.payment_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payment.suppliers?.name}</p>
                            {payment.suppliers?.company && (
                              <p className="text-sm text-muted-foreground">{payment.suppliers.company}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payment.accounts?.account_name}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {payment.accounts?.account_type}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-red-600">
                            -₹{Number(payment.amount).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getPaymentMethodIcon(payment.payment_method)}
                            <span className="capitalize">
                              {payment.payment_method.replace('_', ' ')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={payment.status === 'completed' ? 'default' : 'secondary'}
                            className={payment.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleDelete(payment.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}