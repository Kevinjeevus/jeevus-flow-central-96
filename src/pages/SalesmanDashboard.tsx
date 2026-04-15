import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { 
  DollarSign, 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  Clock,
  MapPin,
  Plus,
  Calendar,
  Target,
  LogOut,
  FileText
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { InvoiceForm } from "@/components/InvoiceForm";
import { ExpenseForm } from "@/components/ExpenseForm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";


interface DashboardStats {
  todaySales: number;
  monthSales: number;
  totalCustomers: number;
  pendingOrders: number;
  expenses: number;
}

export default function SalesmanDashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    monthSales: 0,
    totalCustomers: 0,
    pendingOrders: 0,
    expenses: 0,
  });
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [attendance, setAttendance] = useState<any>(null);
  const { toast } = useToast();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/employee-auth" replace />;
  }

  useEffect(() => {
    checkAttendanceFirst();
  }, [user]);

  const checkAttendanceFirst = async () => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("login_time", today)
      .eq("status", "active")
      .limit(1);

    if (!data?.length) {
      // No attendance marked, redirect to attendance page
      navigate('/attendance');
    } else {
      setAttendance(data[0]);
      fetchDashboardData();
    }
  };

  const fetchDashboardData = async () => {
    try {
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      // Today's sales
      const { data: todaySales } = await supabase
        .from("sales_invoices")
        .select("total_amount")
        .eq("user_id", user.id)
        .eq("invoice_date", today);

      // Month's sales
      const { data: monthSales } = await supabase
        .from("sales_invoices")
        .select("total_amount")
        .eq("user_id", user.id)
        .gte("invoice_date", monthStart);

      // Total customers
      const { count: customerCount } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });

      // Pending orders
      const { count: pendingCount } = await supabase
        .from("sales_orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // User expenses
      const { data: userExpenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("user_id", user.id)
        .gte("expense_date", monthStart);

      setStats({
        todaySales: todaySales?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0,
        monthSales: monthSales?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0,
        totalCustomers: customerCount || 0,
        pendingOrders: pendingCount || 0,
        expenses: userExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const handleLogout = async () => {
    try {
      if (attendance) {
        await supabase
          .from("user_sessions")
          .update({ 
            logout_time: new Date().toISOString(),
            status: "completed"
          })
          .eq("id", attendance.id);
      }

      await signOut();
      
      toast({
        title: "Success",
        description: "Logged out successfully!",
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const markAttendance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's route (for now, use first available route)
      const { data: routes } = await supabase
        .from("routes")
        .select("id")
        .eq("status", "active")
        .limit(1);

      if (!routes?.length) {
        toast({
          title: "Error",
          description: "No active routes found. Contact admin.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("user_sessions").insert({
        user_id: user.id,
        route_id: routes[0].id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Attendance marked successfully",
      });

      checkAttendanceFirst();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const markLogout = async () => {
    try {
      if (!attendance) return;

      const { error } = await supabase
        .from("user_sessions")
        .update({ 
          logout_time: new Date().toISOString(),
          status: "completed"
        })
        .eq("id", attendance.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Logout marked successfully",
      });

      checkAttendanceFirst();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Sales Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's your sales overview.</p>
          </div>
          
          {/* Logout Button */}
          <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">₹{stats.todaySales.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Month Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">₹{stats.monthSales.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{stats.totalCustomers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expenses</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">₹{stats.expenses.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sales" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Sales Activities</h2>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/sale-invoices')}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Manage Sales
                </Button>
                <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Quick Invoice
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <InvoiceForm 
                      onSuccess={() => {
                        setIsInvoiceDialogOpen(false);
                        fetchDashboardData();
                      }}
                      onClose={() => setIsInvoiceDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Recent Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No recent orders</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Customer Visits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No recent visits</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Today's Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendance ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Login Time:</span>
                      <span>{new Date(attendance.login_time).toLocaleTimeString()}</span>
                    </div>
                    {attendance.logout_time && (
                      <div className="flex justify-between">
                        <span>Logout Time:</span>
                        <span>{new Date(attendance.logout_time).toLocaleTimeString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge variant={attendance.logout_time ? "secondary" : "default"}>
                        {attendance.logout_time ? "Completed" : "Active"}
                      </Badge>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <Button 
                        onClick={handleLogout} 
                        variant="destructive" 
                        size="sm"
                        className="w-full"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        End Session & Logout
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Attendance is required to access dashboard</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="expenses" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Expense Management</h2>
              <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <ExpenseForm 
                    onSuccess={() => {
                      setIsExpenseDialogOpen(false);
                      fetchDashboardData();
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Monthly Expenses</CardTitle>
                <CardDescription>Your expenses for this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{stats.expenses.toLocaleString()}</div>
                <p className="text-muted-foreground">Total expenses this month</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}