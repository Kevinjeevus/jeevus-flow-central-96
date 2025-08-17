import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

interface Supplier {
  id: string;
  name: string;
  company: string;
  email: string;
}

interface Account {
  id: string;
  account_name: string;
  account_type: string;
  current_balance: number | null;
  account_number: string;
  bank_name: string;
}

interface PaymentOutFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function PaymentOutForm({ onClose, onSuccess }: PaymentOutFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [paymentData, setPaymentData] = useState({
    supplier_id: "",
    account_id: "",
    amount: "",
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: "cash",
    reference_number: "",
    description: ""
  });

  useEffect(() => {
    fetchSuppliers();
    fetchAccounts();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, company, email')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, account_name, account_type, current_balance, account_number, bank_name')
        .eq('is_active', true)
        .order('account_name');
      
      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
    }
  };

  const generatePaymentNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO${year}${month}${random}`;
  };

  const handleSave = async () => {
    if (!paymentData.supplier_id || !paymentData.account_id || !paymentData.amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(paymentData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    // Check if account has sufficient balance
    const selectedAccount = accounts.find(acc => acc.id === paymentData.account_id);
    if (selectedAccount && (selectedAccount.current_balance || 0) < amount) {
      toast({
        title: "Error",
        description: "Insufficient account balance",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const paymentNumber = generatePaymentNumber();
      
      const { error } = await supabase
        .from('payments')
        .insert({
          supplier_id: paymentData.supplier_id,
          account_id: paymentData.account_id,
          amount: amount,
          payment_date: paymentData.payment_date,
          payment_method: paymentData.payment_method,
          payment_type: 'out',
          reference_number: paymentData.reference_number || null,
          description: paymentData.description || null,
          payment_number: paymentNumber,
          user_id: user?.id,
          created_by: user?.id,
          status: 'completed'
        });

      if (error) throw error;

      // Create account transaction for the payment
      await supabase
        .from('account_transactions')
        .insert({
          account_id: paymentData.account_id,
          amount: amount,
          transaction_type: 'debit',
          description: `Payment Out - ${paymentNumber}`,
          reference_type: 'payment_out',
          transaction_date: paymentData.payment_date,
          user_id: user?.id,
          created_by: user?.id
        });

      toast({
        title: "Success",
        description: "Payment out record created successfully",
      });
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment out record",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedAccount = accounts.find(acc => acc.id === paymentData.account_id);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">New Payment Out</h2>
          <p className="text-muted-foreground">Record a new outgoing payment</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Saving..." : "Save Payment"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier">Supplier *</Label>
                <Select 
                  value={paymentData.supplier_id} 
                  onValueChange={(value) => setPaymentData({...paymentData, supplier_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        <div>
                          <div className="font-medium">{supplier.name}</div>
                          {supplier.company && (
                            <div className="text-sm text-muted-foreground">{supplier.company}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="account">Payment Account *</Label>
                <Select 
                  value={paymentData.account_id} 
                  onValueChange={(value) => setPaymentData({...paymentData, account_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div>
                          <div className="font-medium">{account.account_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Balance: ₹{(account.current_balance || 0).toFixed(2)}
                            {account.account_number && ` • ${account.account_number}`}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAccount && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Available Balance: ₹{(selectedAccount.current_balance || 0).toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentData.payment_date}
                  onChange={(e) => setPaymentData({...paymentData, payment_date: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select 
                  value={paymentData.payment_method} 
                  onValueChange={(value) => setPaymentData({...paymentData, payment_method: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input
                  id="reference_number"
                  placeholder="Transaction/Cheque number"
                  value={paymentData.reference_number}
                  onChange={(e) => setPaymentData({...paymentData, reference_number: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Payment description or notes"
                value={paymentData.description}
                onChange={(e) => setPaymentData({...paymentData, description: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}