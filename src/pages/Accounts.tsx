import { useState } from "react";
import { ErpLayout } from "@/components/ErpLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, DollarSign, TrendingUp, TrendingDown, Building2, Wallet, Receipt } from "lucide-react";
import { AccountForm } from "@/components/finance/AccountForm";
import { AccountsList } from "@/components/finance/AccountsList";
import { BankAccountsList } from "@/components/finance/BankAccountsList";
import { CashAccountsList } from "@/components/finance/CashAccountsList";
import { ChequesList } from "@/components/finance/ChequesList";
import { ChequeForm } from "@/components/finance/ChequeForm";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Accounts() {
  const [showForm, setShowForm] = useState(false);
  const [showChequeForm, setShowChequeForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editingCheque, setEditingCheque] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("account_code");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: summaryData } = useQuery({
    queryKey: ["accounts-summary"],
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

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAccount(null);
  };

  const handleEditCheque = (cheque: any) => {
    setEditingCheque(cheque);
    setShowChequeForm(true);
  };

  const handleCloseChequeForm = () => {
    setShowChequeForm(false);
    setEditingCheque(null);
  };

  return (
    <ErpLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Financial Accounts</h1>
            <p className="text-muted-foreground">Manage your bank accounts, cash, and cheques</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assets</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summaryData?.assets?.toLocaleString() || '0'}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Liabilities</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summaryData?.liabilities?.toLocaleString() || '0'}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Equity</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summaryData?.equity?.toLocaleString() || '0'}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summaryData?.income?.toLocaleString() || '0'}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summaryData?.expenses?.toLocaleString() || '0'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Accounts Management Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Bank Accounts
            </TabsTrigger>
            <TabsTrigger value="cash" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Cash in Hand
            </TabsTrigger>
            <TabsTrigger value="cheques" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Cheques
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">All Accounts</h3>
              <Button 
                onClick={() => setShowForm(true)} 
                className="bg-gradient-primary hover:bg-gradient-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </div>
            <AccountsList 
              accounts={accounts || []} 
              isLoading={isLoading}
              onEdit={handleEdit}
            />
          </TabsContent>

          <TabsContent value="bank" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Bank Accounts</h3>
              <Button 
                onClick={() => {
                  setEditingAccount({ account_type: 'assets' });
                  setShowForm(true);
                }} 
                className="bg-gradient-primary hover:bg-gradient-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Bank Account
              </Button>
            </div>
            <BankAccountsList />
          </TabsContent>

          <TabsContent value="cash" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Cash in Hand</h3>
              <Button 
                onClick={() => {
                  setEditingAccount({ account_type: 'assets' });
                  setShowForm(true);
                }} 
                className="bg-gradient-primary hover:bg-gradient-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Cash Account
              </Button>
            </div>
            <CashAccountsList />
          </TabsContent>

          <TabsContent value="cheques" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Cheques Management</h3>
              <Button 
                onClick={() => setShowChequeForm(true)} 
                className="bg-gradient-primary hover:bg-gradient-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Cheque
              </Button>
            </div>
            <ChequesList onEdit={handleEditCheque} />
          </TabsContent>
        </Tabs>

        {/* Account Form Dialog */}
        {showForm && (
          <AccountForm 
            account={editingAccount}
            onClose={handleCloseForm}
          />
        )}

        {/* Cheque Form Dialog */}
        {showChequeForm && (
          <ChequeForm 
            cheque={editingCheque}
            onClose={handleCloseChequeForm}
          />
        )}
      </div>
    </ErpLayout>
  );
}