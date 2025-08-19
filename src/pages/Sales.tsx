
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, TrendingUp, DollarSign, FileText, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSalesMetrics } from "@/hooks/useSalesData";
import { RecentSalesTable } from "@/components/sales/RecentSalesTable";
import { Skeleton } from "@/components/ui/skeleton";

export default function Sales() {
  const { data: metrics, isLoading: metricsLoading } = useSalesMetrics();

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-2xl font-bold">{formatCurrency(metrics?.totalSales || 0)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Invoices</p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{metrics?.totalInvoices || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Orders</p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{metrics?.totalOrders || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-2xl font-bold">{formatCurrency(metrics?.totalRevenue || 0)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Sales Activity
          </CardTitle>
          <CardDescription>
            Overview of your recent sales transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecentSalesTable />
        </CardContent>
      </Card>
    </div>
  );
}
