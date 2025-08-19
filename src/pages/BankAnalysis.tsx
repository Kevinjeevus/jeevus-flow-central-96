
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";
import { BankAnalysisList } from "@/components/finance/BankAnalysisList";
import { BankAnalysisForm } from "@/components/finance/BankAnalysisForm";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function BankAnalysis() {
  const [showForm, setShowForm] = useState(false);
  const [editingAnalysis, setEditingAnalysis] = useState(null);

  const { data: bankAnalyses, isLoading } = useQuery({
    queryKey: ["bank-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_analysis")
        .select(`
          *,
          accounts(account_name, account_code)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["bank-analysis-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_analysis")
        .select("total_credits, total_debits, closing_balance, transaction_count");
      
      if (error) throw error;
      
      const totalCredits = data?.reduce((sum, analysis) => sum + Number(analysis.total_credits), 0) || 0;
      const totalDebits = data?.reduce((sum, analysis) => sum + Number(analysis.total_debits), 0) || 0;
      const totalBalance = data?.reduce((sum, analysis) => sum + Number(analysis.closing_balance), 0) || 0;
      const totalTransactions = data?.reduce((sum, analysis) => sum + Number(analysis.transaction_count), 0) || 0;
      
      return { totalCredits, totalDebits, totalBalance, totalTransactions, totalAccounts: data?.length || 0 };
    },
  });

  const handleEdit = (analysis: any) => {
    setEditingAnalysis(analysis);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAnalysis(null);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bank Analysis</h1>
          <p className="text-muted-foreground">Analyze bank statements and track cash flow</p>
        </div>
        <Button 
          onClick={() => setShowForm(true)} 
          className="bg-gradient-primary hover:bg-gradient-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Analysis
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              ₹{summary?.totalCredits?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">Money in</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              ₹{summary?.totalDebits?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">Money out</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{summary?.totalBalance?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">Current total</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.totalTransactions?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">Total processed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bank Accounts</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.totalAccounts || '0'}
            </div>
            <p className="text-xs text-muted-foreground">Analyzed</p>
          </CardContent>
        </Card>
      </div>

      {/* Bank Analysis List */}
      <BankAnalysisList 
        analyses={bankAnalyses || []} 
        isLoading={isLoading}
        onEdit={handleEdit}
      />

      {/* Bank Analysis Form Dialog */}
      {showForm && (
        <BankAnalysisForm 
          analysis={editingAnalysis}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
