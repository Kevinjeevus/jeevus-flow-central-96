import { useState } from "react";
import { ErpLayout } from "@/components/ErpLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, DollarSign, Calendar, Download, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportsList } from "@/components/finance/ReportsList";
import { ReportFilters } from "@/components/finance/ReportFilters";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function FinanceReports() {
  const [activeTab, setActiveTab] = useState("profit_loss");
  const [reportFilters, setReportFilters] = useState({
    start_date: "",
    end_date: "",
    account_type: "",
  });

  const { data: reportConfigs, isLoading } = useQuery({
    queryKey: ["report-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_configs")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: accountsSummary } = useQuery({
    queryKey: ["accounts-summary-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("account_type, current_balance");
      
      if (error) throw error;
      
      const summary = data?.reduce((acc, account) => {
        acc[account.account_type] = (acc[account.account_type] || 0) + Number(account.current_balance);
        return acc;
      }, {} as Record<string, number>);
      
      return summary;
    },
  });

  const generateReport = (reportType: string) => {
    console.log(`Generating ${reportType} report with filters:`, reportFilters);
    // Implementation for report generation would go here
  };

  const reportTypes = [
    {
      id: "profit_loss",
      name: "Profit & Loss",
      description: "Income and expenses for a period",
      icon: TrendingUp,
    },
    {
      id: "balance_sheet",
      name: "Balance Sheet",
      description: "Assets, liabilities, and equity",
      icon: DollarSign,
    },
    {
      id: "cash_flow",
      name: "Cash Flow",
      description: "Cash inflows and outflows",
      icon: Calendar,
    },
    {
      id: "trial_balance",
      name: "Trial Balance",
      description: "All account balances",
      icon: FileText,
    },
    {
      id: "gst_summary",
      name: "GST Summary",
      description: "GST tax summary",
      icon: FileText,
    },
    {
      id: "bank_reconciliation",
      name: "Bank Reconciliation",
      description: "Bank statement matching",
      icon: DollarSign,
    },
  ];

  return (
    <ErpLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Financial Reports</h1>
            <p className="text-muted-foreground">Generate and manage financial reports</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{accountsSummary?.assets?.toLocaleString() || '0'}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
              <TrendingUp className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{accountsSummary?.liabilities?.toLocaleString() || '0'}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Income</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{((accountsSummary?.income || 0) - (accountsSummary?.expenses || 0)).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Equity</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{accountsSummary?.equity?.toLocaleString() || '0'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Report Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {reportTypes.map((report) => {
            const IconComponent = report.icon;
            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconComponent className="h-5 w-5" />
                    {report.name}
                  </CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => generateReport(report.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => generateReport(report.id)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Report Filters */}
        <ReportFilters 
          filters={reportFilters}
          onFiltersChange={setReportFilters}
        />

        {/* Recent Reports */}
        <ReportsList 
          reports={reportConfigs || []} 
          isLoading={isLoading}
        />
      </div>
    </ErpLayout>
  );
}