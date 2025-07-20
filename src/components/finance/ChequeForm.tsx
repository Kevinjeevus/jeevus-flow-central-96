import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

interface ChequeFormProps {
  cheque?: any;
  onClose: () => void;
}

export function ChequeForm({ cheque, onClose }: ChequeFormProps) {
  const [formData, setFormData] = useState({
    cheque_number: "",
    bank_name: "",
    amount: "",
    cheque_date: "",
    payee_name: "",
    account_id: "",
    notes: "",
    status: "pending"
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, account_name, account_code")
        .eq("account_type", "assets")
        .order("account_name");
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (cheque) {
      setFormData({
        cheque_number: cheque.cheque_number || "",
        bank_name: cheque.bank_name || "",
        amount: cheque.amount?.toString() || "",
        cheque_date: cheque.cheque_date || "",
        payee_name: cheque.payee_name || "",
        account_id: cheque.account_id || "",
        notes: cheque.notes || "",
        status: cheque.status || "pending"
      });
    }
  }, [cheque]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      if (cheque) {
        const { error } = await supabase
          .from("cheques")
          .update(data)
          .eq("id", cheque.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cheques")
          .insert([{ ...data, user_id: user.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast({
        title: "Success",
        description: `Cheque ${cheque ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${cheque ? "update" : "create"} cheque`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      cheque_number: formData.cheque_number,
      bank_name: formData.bank_name,
      amount: parseFloat(formData.amount),
      cheque_date: formData.cheque_date,
      payee_name: formData.payee_name,
      account_id: formData.account_id || null,
      notes: formData.notes,
      status: formData.status
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{cheque ? "Edit Cheque" : "Add New Cheque"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="cheque_number">Cheque Number</Label>
            <Input
              id="cheque_number"
              value={formData.cheque_number}
              onChange={(e) => setFormData({ ...formData, cheque_number: e.target.value })}
              placeholder="e.g., 123456"
              required
            />
          </div>

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
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="cheque_date">Cheque Date</Label>
            <Input
              id="cheque_date"
              type="date"
              value={formData.cheque_date}
              onChange={(e) => setFormData({ ...formData, cheque_date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="payee_name">Payee Name</Label>
            <Input
              id="payee_name"
              value={formData.payee_name}
              onChange={(e) => setFormData({ ...formData, payee_name: e.target.value })}
              placeholder="e.g., John Doe"
              required
            />
          </div>

          <div>
            <Label htmlFor="account">Account</Label>
            <Select value={formData.account_id} onValueChange={(value) => setFormData({ ...formData, account_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select account (optional)" />
              </SelectTrigger>
              <SelectContent>
                {accounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="deposited">Deposited</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : cheque ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}