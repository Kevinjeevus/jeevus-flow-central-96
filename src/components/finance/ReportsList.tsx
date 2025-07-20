import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Download, Loader2, Star, StarOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ReportsListProps {
  reports: any[];
  isLoading: boolean;
}

export function ReportsList({ reports, isLoading }: ReportsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const favoriteMutation = useMutation({
    mutationFn: async ({ reportId, isFavorite }: { reportId: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from("report_configs")
        .update({ is_favorite: !isFavorite })
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-configs"] });
      toast({
        title: "Success",
        description: "Report favorite status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    },
  });

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case "profit_loss": return "bg-green-100 text-green-800";
      case "balance_sheet": return "bg-blue-100 text-blue-800";
      case "cash_flow": return "bg-purple-100 text-purple-800";
      case "trial_balance": return "bg-orange-100 text-orange-800";
      case "gst_summary": return "bg-red-100 text-red-800";
      case "bank_reconciliation": return "bg-teal-100 text-teal-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getReportTypeName = (type: string) => {
    switch (type) {
      case "profit_loss": return "P&L";
      case "balance_sheet": return "Balance Sheet";
      case "cash_flow": return "Cash Flow";
      case "trial_balance": return "Trial Balance";
      case "gst_summary": return "GST Summary";
      case "bank_reconciliation": return "Bank Reconciliation";
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No saved reports yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Generate your first report to see it here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{report.report_name}</span>
                  <Badge className={getReportTypeColor(report.report_type)}>
                    {getReportTypeName(report.report_type)}
                  </Badge>
                  {report.is_favorite && (
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  )}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Created on {format(new Date(report.created_at), "MMM dd, yyyy 'at' HH:mm")}
                </div>
                
                {report.parameters && Object.keys(report.parameters).length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Parameters: {JSON.stringify(report.parameters)}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => favoriteMutation.mutate({ 
                    reportId: report.id, 
                    isFavorite: report.is_favorite 
                  })}
                  disabled={favoriteMutation.isPending}
                >
                  {report.is_favorite ? (
                    <StarOff className="h-4 w-4" />
                  ) : (
                    <Star className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  title="View Report"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  title="Download Report"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}