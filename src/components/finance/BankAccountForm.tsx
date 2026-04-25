import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BankAccountFormData {
  account_name: string;
  opening_balance: number;
  as_of_date: Date;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
  bank_name: string;
  account_holder_name: string;
  print_upi_qr_code: boolean;
  print_bank_details: boolean;
}

interface BankAccountFormProps {
  onClose: () => void;
  account?: any;
}

export function BankAccountForm({ onClose, account }: BankAccountFormProps) {
  const isEdit = !!account?.id;
  const [asOfDate, setAsOfDate] = useState<Date>(
    account?.as_of_date ? new Date(account.as_of_date) : new Date()
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<BankAccountFormData>({
    defaultValues: {
      account_name: account?.account_name || "",
      opening_balance: account?.opening_balance ?? 0,
      account_number: account?.account_number || "",
      ifsc_code: account?.ifsc_code || "",
      upi_id: account?.upi_id || "",
      bank_name: account?.bank_name || "",
      account_holder_name: account?.account_holder_name || "",
      print_upi_qr_code: account?.print_upi_qr_code ?? true,
      print_bank_details: account?.print_bank_details ?? true,
    }
  });

  useEffect(() => {
    if (account) {
      reset({
        account_name: account.account_name || "",
        opening_balance: account.opening_balance ?? 0,
        account_number: account.account_number || "",
        ifsc_code: account.ifsc_code || "",
        upi_id: account.upi_id || "",
        bank_name: account.bank_name || "",
        account_holder_name: account.account_holder_name || "",
        print_upi_qr_code: account.print_upi_qr_code ?? true,
        print_bank_details: account.print_bank_details ?? true,
      } as any);
      if (account.as_of_date) setAsOfDate(new Date(account.as_of_date));
    }
  }, [account, reset]);

  const saveMutation = useMutation({
    mutationFn: async (data: BankAccountFormData) => {
      const payload = {
        account_name: data.account_name,
        account_number: data.account_number,
        ifsc_code: data.ifsc_code,
        upi_id: data.upi_id,
        bank_name: data.bank_name,
        account_holder_name: data.account_holder_name,
        print_upi_qr_code: data.print_upi_qr_code,
        print_bank_details: data.print_bank_details,
        as_of_date: data.as_of_date.toISOString().split('T')[0],
        opening_balance: data.opening_balance,
      };

      if (isEdit) {
        const { error } = await supabase
          .from("accounts")
          .update(payload)
          .eq("id", account.id);
        if (error) throw error;
      } else {
        const accountCode = `BA-${Date.now()}`;
        const { error } = await supabase
          .from("accounts")
          .insert({
            ...payload,
            account_code: accountCode,
            account_type: "assets",
            current_balance: data.opening_balance,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast({
        title: "Success",
        description: `Bank account ${isEdit ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEdit ? "update" : "create"} bank account`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BankAccountFormData) => {
    saveMutation.mutate({ ...data, as_of_date: asOfDate });
  };

  return (
    <Card className="w-full max-w-4xl border-0 shadow-none">
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Bank Account" : "Add Bank Account"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* First Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_name">Account Display Name</Label>
              <Input
                id="account_name"
                {...register("account_name", { required: "Account name is required" })}
                placeholder="Account Display Name"
              />
              {errors.account_name && (
                <p className="text-sm text-destructive">{errors.account_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="opening_balance">Opening Balance</Label>
              <Input
                id="opening_balance"
                type="number"
                step="0.01"
                {...register("opening_balance", { valueAsNumber: true })}
                placeholder="Opening Balance"
              />
            </div>
            <div className="space-y-2">
              <Label>As Of Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !asOfDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {asOfDate ? format(asOfDate, "dd/MM/yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={asOfDate}
                    onSelect={(date) => date && setAsOfDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="print_upi_qr_code"
                checked={!!watch("print_upi_qr_code")}
                onCheckedChange={(checked) => setValue("print_upi_qr_code", !!checked)}
              />
              <Label htmlFor="print_upi_qr_code">Print UPI QR Code on Invoices</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="print_bank_details"
                checked={!!watch("print_bank_details")}
                onCheckedChange={(checked) => setValue("print_bank_details", !!checked)}
              />
              <Label htmlFor="print_bank_details">Print bank details on invoices</Label>
            </div>
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number *</Label>
              <Input
                id="account_number"
                {...register("account_number", { required: "Account number is required" })}
                placeholder="Account Number"
              />
              {errors.account_number && (
                <p className="text-sm text-destructive">{errors.account_number.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ifsc_code">IFSC Code</Label>
              <div className="relative">
                <Input
                  id="ifsc_code"
                  {...register("ifsc_code")}
                  placeholder="IFSC Code"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="upi_id">UPI ID for QR Code</Label>
              <Input
                id="upi_id"
                {...register("upi_id")}
                placeholder="UPI ID for QR Code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                {...register("bank_name")}
                placeholder="Bank Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_holder_name">Account Holder Name</Label>
              <Input
                id="account_holder_name"
                {...register("account_holder_name")}
                placeholder="Account Holder Name"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (isEdit ? "Updating..." : "Creating...") : (isEdit ? "Update" : "Save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
