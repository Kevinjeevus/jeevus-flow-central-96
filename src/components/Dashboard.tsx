import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ArrowUpRight
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const salesData = [
  { month: "Jan", sales: 65000, target: 70000 },
  { month: "Feb", sales: 72000, target: 70000 },
  { month: "Mar", sales: 68000, target: 75000 },
  { month: "Apr", sales: 81000, target: 80000 },
  { month: "May", sales: 78000, target: 85000 },
  { month: "Jun", sales: 92000, target: 90000 },
];

const categoryData = [
  { name: "Beverages", value: 35, color: "hsl(var(--primary))" },
  { name: "Snacks", value: 28, color: "hsl(var(--accent))" },
  { name: "Dairy", value: 22, color: "hsl(var(--warning))" },
  { name: "Others", value: 15, color: "hsl(var(--muted-foreground))" },
];

const recentOrders = [
  { id: "SO-001", customer: "ABC Retailers", amount: 25430, status: "delivered", date: "2024-01-08" },
  { id: "SO-002", customer: "XYZ Stores", amount: 18200, status: "pending", date: "2024-01-08" },
  { id: "SO-003", customer: "Quick Mart", amount: 32100, status: "processing", date: "2024-01-07" },
  { id: "SO-004", customer: "Food Hub", amount: 15650, status: "delivered", date: "2024-01-07" },
];

const lowStockItems = [
  { product: "Coca Cola 500ml", current: 45, minimum: 100, unit: "bottles" },
  { product: "Lays Classic 50g", current: 23, minimum: 50, unit: "packets" },
  { product: "Amul Milk 1L", current: 12, minimum: 30, unit: "packets" },
];

export function Dashboard() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to JEEVUS ERP. Here's what's happening with your business today.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹4,56,300</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +12.5% from last month
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
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +8.2% from last month
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
            <div className="text-2xl font-bold">342</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-warning flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                5 items low stock
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
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-destructive flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                3 urgent orders
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
            <CardTitle>Category Distribution</CardTitle>
            <CardDescription>Sales by product category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
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
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{order.id}</p>
                    <p className="text-sm text-muted-foreground">{order.customer}</p>
                    <p className="text-xs text-muted-foreground">{order.date}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-medium">₹{order.amount.toLocaleString()}</p>
                    <Badge variant={
                      order.status === "delivered" ? "default" : 
                      order.status === "processing" ? "secondary" : "outline"
                    }>
                      {order.status === "delivered" && <CheckCircle className="w-3 h-3 mr-1" />}
                      {order.status === "processing" && <Clock className="w-3 h-3 mr-1" />}
                      {order.status === "pending" && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Low Stock Alert</CardTitle>
            <CardDescription>Items requiring restock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{item.product}</p>
                    <p className="text-xs text-muted-foreground">
                      Current: {item.current} {item.unit}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm text-destructive font-medium">
                      Min: {item.minimum} {item.unit}
                    </p>
                    <Badge variant="destructive">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Low Stock
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}