import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  ShoppingCart, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  RefreshCw,
  FileText
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface DashboardMetrics {
  totalSales: number;
  monthlyGrowth: number;
  activeCustomers: number;
  customerGrowth: number;
  totalProducts: number;
  lowStockCount: number;
  pendingOrders: number;
  urgentOrders: number;
}

interface SalesData {
  month: string;
  sales: number;
  target: number;
}

interface RecentOrder {
  id: string;
  invoice_number: string;
  customer_name: string;
  total_amount: number;
  status: string;
  invoice_date: string;
}

export function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalSales: 0,
    monthlyGrowth: 0,
    activeCustomers: 0,
    customerGrowth: 0,
    totalProducts: 0,
    lowStockCount: 0,
    pendingOrders: 0,
    urgentOrders: 0,
  });
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMetrics(),
        fetchSalesData(),
        fetchRecentOrders(),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    // Fetch total sales this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { data: currentSales } = await supabase
      .from('sales_invoices')
      .select('total_amount')
      .gte('invoice_date', startOfMonth.toISOString())
      .eq('status', 'paid');
    
    // Fetch last month sales for growth calculation
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(1);
    lastMonth.setHours(0, 0, 0, 0);
    
    const endLastMonth = new Date();
    endLastMonth.setDate(0);
    endLastMonth.setHours(23, 59, 59, 999);
    
    const { data: lastMonthSales } = await supabase
      .from('sales_invoices')
      .select('total_amount')
      .gte('invoice_date', lastMonth.toISOString())
      .lte('invoice_date', endLastMonth.toISOString())
      .eq('status', 'paid');

    // Fetch customer count
    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Fetch product count
    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Fetch pending orders
    const { count: pendingCount } = await supabase
      .from('sales_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const totalSales = currentSales?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
    const lastMonthTotal = lastMonthSales?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
    const monthlyGrowth = lastMonthTotal > 0 ? ((totalSales - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    setMetrics({
      totalSales,
      monthlyGrowth,
      activeCustomers: customerCount || 0,
      customerGrowth: 8.2, // Mock data for now
      totalProducts: productCount || 0,
      lowStockCount: 5, // Mock data for now
      pendingOrders: pendingCount || 0,
      urgentOrders: 3, // Mock data for now
    });
  };

  const fetchSalesData = async () => {
    // Fetch last 6 months sales data
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const { data } = await supabase
        .from('sales_invoices')
        .select('total_amount')
        .gte('invoice_date', date.toISOString())
        .lt('invoice_date', nextMonth.toISOString())
        .eq('status', 'paid');
      
      const totalSales = data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      
      months.push({
        month: date.toLocaleString('default', { month: 'short' }),
        sales: totalSales,
        target: totalSales * 1.1, // Mock target 10% higher
      });
    }
    
    setSalesData(months);
  };

  const fetchRecentOrders = async () => {
    const { data } = await supabase
      .from('sales_invoices')
      .select(`
        id,
        invoice_number,
        total_amount,
        status,
        invoice_date,
        customers (name)
      `)
      .order('created_at', { ascending: false })
      .limit(4);
    
    if (data) {
      const formattedOrders = data.map(order => ({
        id: order.id,
        invoice_number: order.invoice_number,
        customer_name: order.customers?.name || 'Unknown Customer',
        total_amount: Number(order.total_amount),
        status: order.status,
        invoice_date: order.invoice_date,
      }));
      setRecentOrders(formattedOrders);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to JEEVUS ERP. Here's what's happening with your business today.
          </p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{metrics.totalSales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className={`flex items-center gap-1 ${metrics.monthlyGrowth >= 0 ? 'text-success' : 'text-destructive'}`}>
                {metrics.monthlyGrowth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {metrics.monthlyGrowth >= 0 ? '+' : ''}{metrics.monthlyGrowth.toFixed(1)}% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +{metrics.customerGrowth.toFixed(1)}% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-warning flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {metrics.lowStockCount} items low stock
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-destructive flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                {metrics.urgentOrders} urgent orders
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Sales Performance</CardTitle>
            <CardDescription>Monthly sales vs targets</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, ""]} />
                <Bar dataKey="sales" fill="hsl(var(--primary))" />
                <Bar dataKey="target" fill="hsl(var(--muted))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Monthly Sales Trend</CardTitle>
            <CardDescription>Sales performance over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, ""]} />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders and Low Stock */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest sales orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length > 0 ? recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{order.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.invoice_date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-medium">₹{order.total_amount.toLocaleString()}</p>
                    <Badge variant={
                      order.status === "paid" ? "default" : 
                      order.status === "processing" ? "secondary" : "outline"
                    }>
                      {order.status === "paid" && <CheckCircle className="w-3 h-3 mr-1" />}
                      {order.status === "processing" && <Clock className="w-3 h-3 mr-1" />}
                      {order.status === "draft" && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {order.status}
                    </Badge>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent invoices</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-16 flex flex-col gap-1">
                <ShoppingCart className="h-5 w-5" />
                <span className="text-xs">New Invoice</span>
              </Button>
              <Button variant="outline" className="h-16 flex flex-col gap-1">
                <Users className="h-5 w-5" />
                <span className="text-xs">Add Customer</span>
              </Button>
              <Button variant="outline" className="h-16 flex flex-col gap-1">
                <Package className="h-5 w-5" />
                <span className="text-xs">Manage Stock</span>
              </Button>
              <Button variant="outline" className="h-16 flex flex-col gap-1">
                <FileText className="h-5 w-5" />
                <span className="text-xs">View Reports</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Key Metrics Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className="shadow-card">
            <CardHeader>
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}