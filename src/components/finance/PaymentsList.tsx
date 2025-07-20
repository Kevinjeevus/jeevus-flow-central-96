import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Loader2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PaymentsListProps {
  payments: any[];
  isLoading: boolean;
  onEdit: (payment: any) => void;
  paymentType: "payment_in" | "payment_out";
}

export function PaymentsList({ payments, isLoading, onEdit, paymentType }: PaymentsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from("payments")
        .delete()
        .eq("id", paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({
        title: "Success",
        description: "Payment deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete payment",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "cash": return "bg-blue-100 text-blue-800";
      case "bank_transfer": return "bg-purple-100 text-purple-800";
      case "cheque": return "bg-orange-100 text-orange-800";
      case "card": return "bg-pink-100 text-pink-800";
      case "upi": return "bg-emerald-100 text-emerald-800";
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

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No payments recorded yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{paymentType === "payment_in" ? "Incoming" : "Outgoing"} Payments</span>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                    {payment.payment_number}
                  </span>
                  <Badge className={getStatusColor(payment.status)}>
                    {payment.status}
                  </Badge>
                  <Badge className={getMethodColor(payment.payment_method)}>
                    {payment.payment_method.replace('_', ' ')}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{format(new Date(payment.payment_date), "MMM dd, yyyy")}</span>
                  <span>•</span>
                  <span>{payment.customers?.name || payment.suppliers?.name || "N/A"}</span>
                  <span>•</span>
                  <span>{payment.accounts?.account_name}</span>
                </div>
                
                {payment.description && (
                  <p className="text-sm text-muted-foreground">{payment.description}</p>
                )}
                
                {payment.reference_number && (
                  <p className="text-xs text-muted-foreground">
                    Ref: {payment.reference_number}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-semibold text-lg">
                    ₹{Number(payment.amount).toLocaleString()}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(payment)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(payment.id)}
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
  );
}