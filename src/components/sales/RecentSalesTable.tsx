import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRecentSalesActivity } from "@/hooks/useSalesData";
import { Skeleton } from "@/components/ui/skeleton";

export const RecentSalesTable = () => {
  const { data: recentSales, isLoading, error } = useRecentSalesActivity();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>Error loading sales activity</p>
      </div>
    );
  }

  if (!recentSales || recentSales.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No sales activity found</p>
        <p className="text-sm">Start making sales to see your activity here</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recentSales.map((sale) => (
          <TableRow key={sale.id}>
            <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
            <TableCell>{sale.customerName}</TableCell>
            <TableCell>₹{sale.amount.toLocaleString()}</TableCell>
            <TableCell>{sale.date}</TableCell>
            <TableCell>
              <Badge className={getStatusColor(sale.status)}>
                {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};