import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

interface BankAnalysisFormProps {
  analysis?: any;
  onClose: () => void;
}

export function BankAnalysisForm({ analysis, onClose }: BankAnalysisFormProps) {
  const [formData, setFormData] = useState({
    account_id: "",
    bank_name: "",
    account_number: "",
    statement_period_start: "",
    statement_period_end: "",
    opening_balance: "",
    closing_balance: "",
    total_credits: "",
    total_debits: "",
    transaction_count: "",
    average_balance: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accounts } = useQuery({
    queryKey: ["accounts-bank"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, account_code, account_name")
        .eq("account_type", "assets")
        .order("account_code");
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (analysis) {
      setFormData({
        account_id: analysis.account_id || "",
        bank_name: analysis.bank_name || "",
        account_number: analysis.account_number || "",
        statement_period_start: analysis.statement_period_start || "",
        statement_period_end: analysis.statement_period_end || "",
        opening_balance: analysis.opening_balance?.toString() || "",
        closing_balance: analysis.closing_balance?.toString() || "",
        total_credits: analysis.total_credits?.toString() || "",
        total_debits: analysis.total_debits?.toString() || "",
        transaction_count: analysis.transaction_count?.toString() || "",
        average_balance: analysis.average_balance?.toString() || "",
      });
    }
  }, [analysis]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        account_id: data.account_id,
        bank_name: data.bank_name,
        account_number: data.account_number,
        statement_period_start: data.statement_period_start,
        statement_period_end: data.statement_period_end,
        opening_balance: parseFloat(data.opening_balance) || 0,
        closing_balance: parseFloat(data.closing_balance) || 0,
        total_credits: parseFloat(data.total_credits) || 0,
        total_debits: parseFloat(data.total_debits) || 0,
        transaction_count: parseInt(data.transaction_count) || 0,
        average_balance: parseFloat(data.average_balance) || 0,
      };

      if (analysis?.id) {
        const { error } = await supabase
          .from("bank_analysis")
          .update(payload)
          .eq("id", analysis.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("bank_analysis")
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-analysis"] });
      queryClient.invalidateQueries({ queryKey: ["bank-analysis-summary"] });
      toast({
        title: "Success",
        description: `Bank analysis ${analysis?.id ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${analysis?.id ? "update" : "create"} bank analysis`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {analysis?.id ? "Edit Bank Analysis" : "New Bank Analysis"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="account_id">Bank Account</Label>
            <Select 
              value={formData.account_id} 
              onValueChange={(value) => setFormData({ ...formData, account_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bank account" />
              </SelectTrigger>
              <SelectContent>
                {accounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.account_code} - {account.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="e.g., State Bank of India"
                required
              />
            </div>

            <div>
              <Label htmlFor="account_number">Account Number</Label>
              <Input
                id="account_number"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="Bank account number"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="statement_period_start">Statement Start Date</Label>
              <Input
                id="statement_period_start"
                type="date"
                value={formData.statement_period_start}
                onChange={(e) => setFormData({ ...formData, statement_period_start: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="statement_period_end">Statement End Date</Label>
              <Input
                id="statement_period_end"
                type="date"
                value={formData.statement_period_end}
                onChange={(e) => setFormData({ ...formData, statement_period_end: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="opening_balance">Opening Balance</Label>
              <Input
                id="opening_balance"
                type="number"
                step="0.01"
                value={formData.opening_balance}
                onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="closing_balance">Closing Balance</Label>
              <Input
                id="closing_balance"
                type="number"
                step="0.01"
                value={formData.closing_balance}
                onChange={(e) => setFormData({ ...formData, closing_balance: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="total_credits">Total Credits</Label>
              <Input
                id="total_credits"
                type="number"
                step="0.01"
                value={formData.total_credits}
                onChange={(e) => setFormData({ ...formData, total_credits: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="total_debits">Total Debits</Label>
              <Input
                id="total_debits"
                type="number"
                step="0.01"
                value={formData.total_debits}
                onChange={(e) => setFormData({ ...formData, total_debits: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="transaction_count">Transaction Count</Label>
              <Input
                id="transaction_count"
                type="number"
                value={formData.transaction_count}
                onChange={(e) => setFormData({ ...formData, transaction_count: e.target.value })}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="average_balance">Average Balance</Label>
              <Input
                id="average_balance"
                type="number"
                step="0.01"
                value={formData.average_balance}
                onChange={(e) => setFormData({ ...formData, average_balance: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : analysis?.id ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}