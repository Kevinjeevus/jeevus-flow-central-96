import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, ShoppingCart, FileText, Calendar, MapPin, TrendingUp, Users, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  todaySales: number;
  monthSales: number;
  totalCustomers: number;
  pendingOrders: number;
  monthExpenses: number;
}

interface AttendanceInfo {
  routeName: string;
  loginTime: string;
  sessionId: string;
}

export default function EmployeeDashboard() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    monthSales: 0,
    totalCustomers: 0,
    pendingOrders: 0,
    monthExpenses: 0,
  });
  const [attendanceInfo, setAttendanceInfo] = useState<AttendanceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchAttendanceInfo();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      // Today's sales
      const { data: todaySalesData } = await supabase
        .from('sales_invoices')
        .select('total_amount')
        .eq('user_id', user?.id)
        .gte('invoice_date', today);

      // Month's sales
      const { data: monthSalesData } = await supabase
        .from('sales_invoices')
        .select('total_amount')
        .eq('user_id', user?.id)
        .gte('invoice_date', startOfMonth);

      // Total customers
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Pending orders
      const { count: pendingCount } = await supabase
        .from('sales_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Month's expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user?.id)
        .gte('expense_date', startOfMonth);

      setStats({
        todaySales: todaySalesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0,
        monthSales: monthSalesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0,
        totalCustomers: customerCount || 0,
        pendingOrders: pendingCount || 0,
        monthExpenses: expensesData?.reduce((sum, expense) => sum + expense.amount, 0) || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendanceInfo = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('user_sessions')
        .select(`
          id,
          login_time,
          routes (name)
        `)
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .gte('login_time', today)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setAttendanceInfo({
          routeName: data.routes.name,
          loginTime: data.login_time,
          sessionId: data.id
        });
      }
    } catch (error) {
      console.error('Error fetching attendance info:', error);
    }
  };

  const handleLogout = async () => {
    try {
      if (attendanceInfo) {
        await supabase
          .from('user_sessions')
          .update({ 
            status: 'completed',
            logout_time: new Date().toISOString()
          })
          .eq('id', attendanceInfo.sessionId);
      }

      await supabase.auth.signOut();
      toast({
        title: "Success",
        description: "Logged out successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to logout",
        variant: "destructive",
      });
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div className="mb-4 md:mb-0">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Employee Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's your daily overview.</p>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm">
            Logout
          </Button>
        </div>

        {/* Attendance Info */}
        {attendanceInfo && (
          <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Session Active</span>
                </div>
                <div className="flex flex-col md:flex-row gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span>{attendanceInfo.routeName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span>Started: {new Date(attendanceInfo.loginTime).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.todaySales.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Month Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.monthSales.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/sale-invoices')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Manage Sales
              </CardTitle>
              <CardDescription>
                Create and manage sales invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                Go to Sales
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/sale-order')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Manage Sale Orders
              </CardTitle>
              <CardDescription>
                View and process customer orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                Go to Orders
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/attendance-history')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Attendance History
              </CardTitle>
              <CardDescription>
                View your attendance records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                View History
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Overview</CardTitle>
            <CardDescription>Your performance summary for this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
              <span className="font-medium">Total Sales</span>
              <Badge variant="secondary" className="text-lg font-bold">
                ₹{stats.monthSales.toFixed(2)}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
              <span className="font-medium">Total Expenses</span>
              <Badge variant="outline" className="text-lg">
                ₹{stats.monthExpenses.toFixed(2)}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
              <span className="font-medium">Net Performance</span>
              <Badge className="text-lg font-bold">
                ₹{(stats.monthSales - stats.monthExpenses).toFixed(2)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}