import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Filter, RefreshCw } from "lucide-react";

interface ReportFiltersProps {
  filters: {
    start_date: string;
    end_date: string;
    account_type: string;
  };
  onFiltersChange: (filters: any) => void;
}

export function ReportFilters({ filters, onFiltersChange }: ReportFiltersProps) {
  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const resetFilters = () => {
    onFiltersChange({
      start_date: "",
      end_date: "",
      account_type: "",
    });
  };

  const setQuickDateRange = (range: string) => {
    const today = new Date();
    let startDate = new Date();
    
    switch (range) {
      case "this_month":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "last_month":
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        today.setDate(0); // Last day of previous month
        break;
      case "this_quarter":
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        break;
      case "this_year":
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      case "last_year":
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        today.setFullYear(today.getFullYear() - 1, 11, 31);
        break;
    }
    
    onFiltersChange({
      ...filters,
      start_date: startDate.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0],
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Report Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date"
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange("start_date", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="end_date">End Date</Label>
            <Input
              id="end_date"
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange("end_date", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="account_type">Account Type</Label>
            <Select 
              value={filters.account_type} 
              onValueChange={(value) => handleFilterChange("account_type", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All account types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="assets">Assets</SelectItem>
                <SelectItem value="liabilities">Liabilities</SelectItem>
                <SelectItem value="equity">Equity</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expenses">Expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              onClick={resetFilters}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Quick Date Range Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickDateRange("this_month")}
          >
            This Month
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickDateRange("last_month")}
          >
            Last Month
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickDateRange("this_quarter")}
          >
            This Quarter
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickDateRange("this_year")}
          >
            This Year
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickDateRange("last_year")}
          >
            Last Year
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}