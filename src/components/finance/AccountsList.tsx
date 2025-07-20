import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AccountsListProps {
  accounts: any[];
  isLoading: boolean;
  onEdit: (account: any) => void;
}

export function AccountsList({ accounts, isLoading, onEdit }: AccountsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", accountId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-summary"] });
      toast({
        title: "Success",
        description: "Account deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case "assets": return "bg-green-100 text-green-800";
      case "liabilities": return "bg-red-100 text-red-800";
      case "equity": return "bg-blue-100 text-blue-800";
      case "income": return "bg-emerald-100 text-emerald-800";
      case "expenses": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
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

  // Group accounts by type
  const groupedAccounts = accounts.reduce((acc: Record<string, any[]>, account: any) => {
    if (!acc[account.account_type]) {
      acc[account.account_type] = [];
    }
    acc[account.account_type].push(account);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge className={getAccountTypeColor(type)}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ({(typeAccounts as any[]).length} accounts)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(typeAccounts as any[]).map((account: any) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                        {account.account_code}
                      </span>
                      <span className="font-medium">{account.account_name}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold">
                        ₹{Number(account.current_balance).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Current Balance
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(account)}
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
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}