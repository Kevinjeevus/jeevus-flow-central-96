import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Loader2, Eye, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface BankAnalysisListProps {
  analyses: any[];
  isLoading: boolean;
  onEdit: (analysis: any) => void;
}

export function BankAnalysisList({ analyses, isLoading, onEdit }: BankAnalysisListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      const { error } = await supabase
        .from("bank_analysis")
        .delete()
        .eq("id", analysisId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-analysis"] });
      toast({
        title: "Success",
        description: "Bank analysis deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete bank analysis",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (analyses.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No bank analyses created yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Start by uploading a bank statement for analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Bank Statement Analyses</span>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {analyses.map((analysis) => (
            <div
              key={analysis.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="font-semibold">{analysis.bank_name}</div>
                  <Badge variant="outline">
                    {analysis.accounts?.account_code} - {analysis.accounts?.account_name}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    A/C: ****{analysis.account_number.slice(-4)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Period:</span>
                    <div className="font-medium">
                      {format(new Date(analysis.statement_period_start), "MMM dd")} - {" "}
                      {format(new Date(analysis.statement_period_end), "MMM dd, yyyy")}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">Opening:</span>
                    <div className="font-medium">
                      ₹{Number(analysis.opening_balance).toLocaleString()}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">Closing:</span>
                    <div className="font-medium">
                      ₹{Number(analysis.closing_balance).toLocaleString()}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">Transactions:</span>
                    <div className="font-medium">
                      {Number(analysis.transaction_count).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Credits:</span>
                    <span className="font-medium text-success">
                      ₹{Number(analysis.total_credits).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Debits:</span>
                    <span className="font-medium text-destructive">
                      ₹{Number(analysis.total_debits).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Avg Balance:</span>
                    <span className="font-medium">
                      ₹{Number(analysis.average_balance).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  title="View Transactions"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(analysis)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(analysis.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}