import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Edit, Trash2, Plus, Search, Building2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BankAccountForm } from "./BankAccountForm";

export function BankAccountsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast({
        title: "Success",
        description: "Bank account deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete bank account",
        variant: "destructive",
      });
    },
  });

  const filteredAccounts = bankAccounts?.filter(account =>
    account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.account_code.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return <div className="text-center py-8">Loading bank accounts...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search bank accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Bank
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl">
            <BankAccountForm onClose={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {filteredAccounts.length > 0 ? (
          filteredAccounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{account.account_name}</CardTitle>
                      <CardDescription>Code: {account.account_code}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={account.is_active ? "default" : "secondary"}>
                      {account.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {/* Handle edit */}}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(account.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Current Balance:</span>
                    <div className="font-semibold text-lg">
                      ₹{account.current_balance?.toLocaleString() || '0'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Opening Balance:</span>
                    <div className="font-semibold">
                      ₹{account.opening_balance?.toLocaleString() || '0'}
                    </div>
                  </div>
                  {account.account_number && (
                    <div>
                      <span className="text-muted-foreground">Account Number:</span>
                      <div className="font-medium">{account.account_number}</div>
                    </div>
                  )}
                  {account.bank_name && (
                    <div>
                      <span className="text-muted-foreground">Bank Name:</span>
                      <div className="font-medium">{account.bank_name}</div>
                    </div>
                  )}
                </div>
                {(account.ifsc_code || account.upi_id) && (
                  <div className="grid grid-cols-2 gap-4 text-sm mt-4 pt-4 border-t">
                    {account.ifsc_code && (
                      <div>
                        <span className="text-muted-foreground">IFSC Code:</span>
                        <div className="font-medium">{account.ifsc_code}</div>
                      </div>
                    )}
                    {account.upi_id && (
                      <div>
                        <span className="text-muted-foreground">UPI ID:</span>
                        <div className="font-medium">{account.upi_id}</div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No bank accounts found</p>
              <p className="text-sm text-muted-foreground">
                Create your first bank account to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}