import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Building2, Plus, ChevronDown, Search, MoreHorizontal } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BankAccountForm } from "@/components/finance/BankAccountForm";
import { ErpLayout } from "@/components/ErpLayout";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function BankAccounts() {
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bankAccounts, isLoading } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("account_type", "assets")
        .ilike("account_name", "%bank%")
        .order("account_code");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ["account-transactions", selectedAccount?.id],
    queryFn: async () => {
      if (!selectedAccount?.id) return [];
      
      const { data, error } = await supabase
        .from("account_transactions")
        .select("*")
        .eq("account_id", selectedAccount.id)
        .order("transaction_date", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedAccount?.id,
  });

  const filteredAccounts = bankAccounts?.filter(account =>
    account.account_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Select first account by default
  if (bankAccounts && bankAccounts.length > 0 && !selectedAccount) {
    setSelectedAccount(bankAccounts[0]);
  }

  if (isLoading) {
    return (
      <ErpLayout>
        <div className="text-center py-8">Loading bank accounts...</div>
      </ErpLayout>
    );
  }

  return (
    <ErpLayout>
      <div className="flex h-full">
        {/* Left Sidebar - Bank Accounts List */}
        <div className="w-80 border-r bg-muted/30 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Banks</h2>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bank
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl">
                <BankAccountForm onClose={() => setIsFormOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium px-2">
              <span>ACCOUNT NAME</span>
              <span>AMOUNT</span>
            </div>

            {filteredAccounts.map((account) => (
              <div
                key={account.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-muted transition-colors",
                  selectedAccount?.id === account.id && "bg-blue-50 border border-blue-200"
                )}
                onClick={() => setSelectedAccount(account)}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{account.account_name}</span>
                </div>
                <span className="font-semibold text-green-600">
                  ₹ {account.current_balance?.toLocaleString() || '0.00'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 space-y-6">
          {selectedAccount ? (
            <>
              {/* Bank Details Form */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Bank Details</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="bg-blue-500 hover:bg-blue-600">
                        Deposit / Withdraw
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Bank to Cash Transfer</DropdownMenuItem>
                      <DropdownMenuItem>Cash to Bank Transfer</DropdownMenuItem>
                      <DropdownMenuItem>Bank to Bank Transfer</DropdownMenuItem>
                      <DropdownMenuItem>Adjust Bank Balance</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input value={selectedAccount.bank_name || ""} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <Input value={selectedAccount.account_number || ""} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>IFSC Code</Label>
                      <Input value={selectedAccount.ifsc_code || ""} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>UPI ID</Label>
                      <Input value={selectedAccount.upi_id || ""} readOnly />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transactions Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>TRANSACTIONS</CardTitle>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search transactions..."
                        className="pl-10 w-64"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>TYPE</TableHead>
                        <TableHead>NAME</TableHead>
                        <TableHead>DATE</TableHead>
                        <TableHead className="text-right">AMOUNT</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions && transactions.length > 0 ? (
                        transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div 
                                  className={cn(
                                    "w-2 h-2 rounded-full",
                                    transaction.transaction_type === 'credit' 
                                      ? "bg-green-500" 
                                      : "bg-red-500"
                                  )}
                                />
                                <span className="capitalize">
                                  {transaction.transaction_type === 'credit' ? 'Sale' : 'Expense'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {transaction.description}
                            </TableCell>
                            <TableCell>
                              {format(new Date(transaction.transaction_date), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={cn(
                                "font-medium",
                                transaction.transaction_type === 'credit' 
                                  ? "text-blue-600" 
                                  : "text-red-600"
                              )}>
                                {transaction.transaction_type === 'credit' ? '₹ ' : '₹ '}
                                {transaction.amount.toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>Edit</DropdownMenuItem>
                                  <DropdownMenuItem>Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No transactions found for this account
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No bank accounts found</p>
                <p className="text-sm text-muted-foreground">
                  Create your first bank account to get started
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErpLayout>
  );
}