import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Search, Receipt, CheckCircle, XCircle, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ChequesListProps {
  onEdit: (cheque: any) => void;
}

export function ChequesList({ onEdit }: ChequesListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cheques, isLoading } = useQuery({
    queryKey: ["cheques"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cheques")
        .select("*, accounts!account_id(account_name)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cheques")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast({
        title: "Success",
        description: "Cheque deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete cheque",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, depositedToAccountId }: { id: string; status: string; depositedToAccountId?: string }) => {
      const updateData: any = { 
        status, 
        updated_at: new Date().toISOString() 
      };
      
      if (status === 'deposited') {
        updateData.deposited_date = new Date().toISOString().split('T')[0];
        updateData.deposited_to_account_id = depositedToAccountId;
      }

      const { error } = await supabase
        .from("cheques")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast({
        title: "Success",
        description: "Cheque status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update cheque status",
        variant: "destructive",
      });
    },
  });

  const filteredCheques = cheques?.filter(cheque => {
    const matchesSearch = 
      cheque.cheque_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cheque.payee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cheque.bank_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || cheque.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'deposited':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'bounced':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return "outline";
      case 'deposited':
        return "default";
      case 'cancelled':
        return "secondary";
      case 'bounced':
        return "destructive";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading cheques...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search cheques..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="deposited">Deposited</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredCheques.length > 0 ? (
          filteredCheques.map((cheque) => (
            <Card key={cheque.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Receipt className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">Cheque #{cheque.cheque_number}</CardTitle>
                      <CardDescription>
                        {cheque.bank_name} • {cheque.payee_name}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(cheque.status)} className="flex items-center gap-1">
                      {getStatusIcon(cheque.status)}
                      {cheque.status.charAt(0).toUpperCase() + cheque.status.slice(1)}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(cheque)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(cheque.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <div className="font-semibold text-lg">
                      ₹{cheque.amount?.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cheque Date:</span>
                    <div className="font-semibold">
                      {format(new Date(cheque.cheque_date), 'dd MMM yyyy')}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Account:</span>
                    <div className="font-semibold">
                      {cheque.accounts?.account_name || 'N/A'}
                    </div>
                  </div>
                </div>
                
                {cheque.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ 
                        id: cheque.id, 
                        status: 'deposited',
                        depositedToAccountId: cheque.account_id 
                      })}
                      disabled={updateStatusMutation.isPending}
                    >
                      Mark as Deposited
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ 
                        id: cheque.id, 
                        status: 'cancelled' 
                      })}
                      disabled={updateStatusMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                
                {cheque.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-muted-foreground text-sm">Notes:</span>
                    <p className="text-sm mt-1">{cheque.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No cheques found</p>
              <p className="text-sm text-muted-foreground">
                Add your first cheque to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}