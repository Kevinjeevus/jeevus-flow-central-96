import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Download, 
  Eye,
  Calendar,
  Target,
  UserCheck,
  Activity,
  Filter,
  Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { DateRange } from "react-day-picker";

interface CRMStats {
  totalCustomers: number;
  activeCustomers: number;
  totalSales: number;
  averageOrderValue: number;
  conversionRate: number;
  salesThisMonth: number;
  salesLastMonth: number;
  topPerformingRoute: string;
}

interface SalesReport {
  id: string;
  employee_name: string;
  route_name: string;
  total_sales: number;
  order_count: number;
  customer_count: number;
  period: string;
}

interface CustomerInsight {
  id: string;
  name: string;
  total_orders: number;
  total_spent: number;
  last_order_date: string;
  status: string;
}

export default function CRM() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  const [stats, setStats] = useState<CRMStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    totalSales: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    salesThisMonth: 0,
    salesLastMonth: 0,
    topPerformingRoute: "N/A"
  });

  const [salesReports, setSalesReports] = useState<SalesReport[]>([]);
  const [customerInsights, setCustomerInsights] = useState<CustomerInsight[]>([]);
  const [reportFilters, setReportFilters] = useState({
    period: "this_month",
    route: "all",
    employee: "all"
  });

  useEffect(() => {
    fetchCRMData();
  }, [dateRange, reportFilters]);

  const fetchCRMData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDashboardStats(),
        fetchSalesReports(),
        fetchCustomerInsights()
      ]);
    } catch (error) {
      console.error("Error fetching CRM data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      // Get current and last month dates
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Total customers
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Active customers (customers with orders this month)
      const { data: activeCustomersData } = await supabase
        .from('sales_invoices')
        .select('customer_id')
        .gte('invoice_date', thisMonthStart.toISOString().split('T')[0]);
      
      const activeCustomers = new Set(activeCustomersData?.map(inv => inv.customer_id) || []).size;

      // Sales this month
      const { data: thisMonthSales } = await supabase
        .from('sales_invoices')
        .select('total_amount')
        .gte('invoice_date', thisMonthStart.toISOString().split('T')[0]);

      const salesThisMonth = thisMonthSales?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

      // Sales last month
      const { data: lastMonthSales } = await supabase
        .from('sales_invoices')
        .select('total_amount')
        .gte('invoice_date', lastMonthStart.toISOString().split('T')[0])
        .lte('invoice_date', lastMonthEnd.toISOString().split('T')[0]);

      const salesLastMonth = lastMonthSales?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

      // Calculate average order value
      const avgOrderValue = thisMonthSales?.length ? salesThisMonth / thisMonthSales.length : 0;

      // Top performing route (simplified)
      const { data: routePerformance } = await supabase
        .from('sales_invoices')
        .select(`
          route_id,
          total_amount,
          routes(name)
        `)
        .gte('invoice_date', thisMonthStart.toISOString().split('T')[0]);

      let topRoute = "N/A";
      if (routePerformance?.length) {
        const routeSales = routePerformance.reduce((acc: any, inv: any) => {
          const routeName = inv.routes?.name || "Unknown";
          acc[routeName] = (acc[routeName] || 0) + Number(inv.total_amount);
          return acc;
        }, {});

        topRoute = Object.entries(routeSales).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || "N/A";
      }

      setStats({
        totalCustomers: totalCustomers || 0,
        activeCustomers,
        totalSales: salesThisMonth,
        averageOrderValue: avgOrderValue,
        conversionRate: totalCustomers ? (activeCustomers / totalCustomers) * 100 : 0,
        salesThisMonth,
        salesLastMonth,
        topPerformingRoute: topRoute
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch dashboard stats",
        variant: "destructive",
      });
    }
  };

  const fetchSalesReports = async () => {
    try {
      const { data: salesData } = await supabase
        .from('sales_invoices')
        .select(`
          user_id,
          total_amount,
          invoice_date,
          route_id,
          routes(name),
          employees!sales_invoices_user_id_fkey(full_name)
        `)
        .gte('invoice_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (salesData) {
        // Group by employee
        const employeeStats = salesData.reduce((acc: any, invoice: any) => {
          const employeeName = invoice.employees?.full_name || 'Unknown';
          const routeName = invoice.routes?.name || 'No Route';
          const key = `${invoice.user_id}-${employeeName}`;
          
          if (!acc[key]) {
            acc[key] = {
              id: invoice.user_id,
              employee_name: employeeName,
              route_name: routeName,
              total_sales: 0,
              order_count: 0,
              customer_count: new Set(),
              period: 'Last 30 days'
            };
          }
          
          acc[key].total_sales += Number(invoice.total_amount);
          acc[key].order_count += 1;
          
          return acc;
        }, {});

        setSalesReports(Object.values(employeeStats).map((stat: any) => ({
          ...stat,
          customer_count: stat.customer_count.size
        })));
      }
    } catch (error: any) {
      console.error("Error fetching sales reports:", error);
    }
  };

  const fetchCustomerInsights = async () => {
    try {
      const { data: customerData } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          status,
          sales_invoices(total_amount, invoice_date)
        `);

      if (customerData) {
        const insights = customerData.map((customer: any) => {
          const invoices = customer.sales_invoices || [];
          const totalSpent = invoices.reduce((sum: number, inv: any) => sum + Number(inv.total_amount), 0);
          const lastOrderDate = invoices.length > 0 
            ? new Date(Math.max(...invoices.map((inv: any) => new Date(inv.invoice_date).getTime())))
            : null;

          return {
            id: customer.id,
            name: customer.name,
            total_orders: invoices.length,
            total_spent: totalSpent,
            last_order_date: lastOrderDate ? lastOrderDate.toISOString().split('T')[0] : 'Never',
            status: customer.status
          };
        });

        setCustomerInsights(insights.sort((a, b) => b.total_spent - a.total_spent));
      }
    } catch (error: any) {
      console.error("Error fetching customer insights:", error);
    }
  };

  const generateReport = async (reportType: string) => {
    try {
      // Save report configuration
      const { error } = await supabase
        .from('report_configs')
        .insert({
          user_id: user?.id,
          report_name: `CRM ${reportType} Report`,
          report_type: reportType,
          parameters: {
            date_range: dateRange ? {
              from: dateRange.from?.toISOString(),
              to: dateRange.to?.toISOString()
            } : null,
            filters: reportFilters
          }
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report generated and saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    }
  };

  const reportTypes = [
    {
      id: "sales_performance",
      name: "Sales Performance",
      description: "Employee and route sales analysis",
      icon: TrendingUp,
    },
    {
      id: "customer_analysis",
      name: "Customer Analysis",
      description: "Customer behavior and purchasing patterns",
      icon: Users,
    },
    {
      id: "route_performance",
      name: "Route Performance", 
      description: "Route-wise sales and customer metrics",
      icon: Target,
    },
    {
      id: "conversion_funnel",
      name: "Conversion Funnel",
      description: "Lead to customer conversion analysis",
      icon: Activity,
    }
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">CRM & Reports</h1>
            <p className="text-muted-foreground">Customer relationship management and business analytics</p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Report
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Custom Report</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportTypes.map((report) => {
                    const IconComponent = report.icon;
                    return (
                      <Card key={report.id} className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <IconComponent className="h-4 w-4" />
                            {report.name}
                          </CardTitle>
                          <CardDescription className="text-sm">{report.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full"
                            onClick={() => generateReport(report.id)}
                          >
                            Generate Report
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="sales">Sales Reports</TabsTrigger>
            <TabsTrigger value="customers">Customer Insights</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeCustomers} active this month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sales This Month</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{stats.salesThisMonth.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.salesLastMonth > 0 
                      ? `${((stats.salesThisMonth - stats.salesLastMonth) / stats.salesLastMonth * 100).toFixed(1)}% from last month`
                      : 'No previous data'
                    }
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{stats.averageOrderValue.toFixed(0)}</div>
                  <p className="text-xs text-muted-foreground">Per transaction</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Active customers ratio</p>
                </CardContent>
              </Card>
            </div>

            {/* Top Performance Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Highlights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-lg font-semibold">Top Route</div>
                    <div className="text-2xl font-bold text-primary">{stats.topPerformingRoute}</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-lg font-semibold">Active Customers</div>
                    <div className="text-2xl font-bold text-green-600">{stats.activeCustomers}</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-lg font-semibold">Growth Rate</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.salesLastMonth > 0 
                        ? `${((stats.salesThisMonth - stats.salesLastMonth) / stats.salesLastMonth * 100).toFixed(1)}%`
                        : 'N/A'
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales Performance by Employee</CardTitle>
                <CardDescription>Individual sales performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Total Sales</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Customers</TableHead>
                        <TableHead>Period</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{report.employee_name}</TableCell>
                          <TableCell>{report.route_name}</TableCell>
                          <TableCell>₹{report.total_sales.toLocaleString()}</TableCell>
                          <TableCell>{report.order_count}</TableCell>
                          <TableCell>{report.customer_count}</TableCell>
                          <TableCell>{report.period}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Insights</CardTitle>
                <CardDescription>Top customers by purchase value and activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Total Orders</TableHead>
                        <TableHead>Total Spent</TableHead>
                        <TableHead>Last Order</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerInsights.slice(0, 20).map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell>{customer.total_orders}</TableCell>
                          <TableCell>₹{customer.total_spent.toLocaleString()}</TableCell>
                          <TableCell>{customer.last_order_date}</TableCell>
                          <TableCell>
                            <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                              {customer.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Analytics</CardTitle>
                <CardDescription>Advanced analytics and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Sales Trend Analysis</h3>
                    <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">Sales chart visualization would go here</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold">Customer Distribution</h3>
                    <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">Customer distribution chart would go here</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}