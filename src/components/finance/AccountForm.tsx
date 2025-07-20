import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

interface AccountFormProps {
  account?: any;
  onClose: () => void;
}

export function AccountForm({ account, onClose }: AccountFormProps) {
  const [formData, setFormData] = useState({
    account_code: "",
    account_name: "",
    account_type: "",
    parent_account_id: "",
    opening_balance: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: parentAccounts } = useQuery({
    queryKey: ["parent-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, account_code, account_name, account_type")
        .order("account_code");
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (account) {
      setFormData({
        account_code: account.account_code || "",
        account_name: account.account_name || "",
        account_type: account.account_type || "",
        parent_account_id: account.parent_account_id || "",
        opening_balance: account.opening_balance?.toString() || "",
      });
    }
  }, [account]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (account) {
        const { error } = await supabase
          .from("accounts")
          .update(data)
          .eq("id", account.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("accounts")
          .insert([{ ...data, current_balance: data.opening_balance }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-summary"] });
      toast({
        title: "Success",
        description: `Account ${account ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${account ? "update" : "create"} account`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      account_code: formData.account_code,
      account_name: formData.account_name,
      account_type: formData.account_type,
      parent_account_id: formData.parent_account_id || null,
      opening_balance: parseFloat(formData.opening_balance) || 0,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? "Edit Account" : "Add New Account"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="account_code">Account Code</Label>
            <Input
              id="account_code"
              value={formData.account_code}
              onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
              placeholder="e.g., 1110"
              required
            />
          </div>

          <div>
            <Label htmlFor="account_name">Account Name</Label>
            <Input
              id="account_name"
              value={formData.account_name}
              onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              placeholder="e.g., Cash in Hand"
              required
            />
          </div>

          <div>
            <Label htmlFor="account_type">Account Type</Label>
            <Select value={formData.account_type} onValueChange={(value) => setFormData({ ...formData, account_type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assets">Assets</SelectItem>
                <SelectItem value="liabilities">Liabilities</SelectItem>
                <SelectItem value="equity">Equity</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expenses">Expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="parent_account">Parent Account</Label>
            <Select value={formData.parent_account_id} onValueChange={(value) => setFormData({ ...formData, parent_account_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select parent account (optional)" />
              </SelectTrigger>
              <SelectContent>
                {parentAccounts?.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.account_code} - {acc.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="opening_balance">Opening Balance</Label>
            <Input
              id="opening_balance"
              type="number"
              step="0.01"
              value={formData.opening_balance}
              onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : account ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}