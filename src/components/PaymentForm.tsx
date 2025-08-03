
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface PaymentFormProps {
  payment?: any;
  paymentType?: "payment_in" | "payment_out";
  onClose: () => void;
}

export function PaymentForm({ payment, paymentType = "payment_in", onClose }: PaymentFormProps) {
  const { toast } = useToast();
  const [paymentData, setPaymentData] = useState({
    customerId: "",
    invoiceId: "",
    paymentNumber: `PAY-${Date.now()}`,
    paymentDate: new Date().toISOString().split('T')[0],
    amount: "",
    paymentMethod: "",
    reference: "",
    notes: "",
  });

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, name, company')
        .eq('status', 'active')
        .order('name');
      return data || [];
    }
  });

  // Fetch invoices for selected customer
  const { data: invoices } = useQuery({
    queryKey: ['customer-invoices', paymentData.customerId],
    queryFn: async () => {
      if (!paymentData.customerId) return [];
      const { data } = await supabase
        .from('sales_invoices')
        .select('id, invoice_number, total_amount, status')
        .eq('customer_id', paymentData.customerId)
        .in('status', ['draft', 'sent', 'partial'])
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!paymentData.customerId
  });

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          customer_id: paymentData.customerId || null,
          payment_number: paymentData.paymentNumber,
          payment_date: paymentData.paymentDate,
          amount: parseFloat(paymentData.amount),
          payment_method: paymentData.paymentMethod,
          reference_number: paymentData.reference,
          description: paymentData.notes,
          payment_type: paymentType,
          account_id: '00000000-0000-0000-0000-000000000000' // Default account - should be configurable
        });

      if (error) throw error;

      toast({
        title: "Payment Recorded",
        description: "Payment has been successfully recorded",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Record Payment</h2>
          <p className="text-muted-foreground">Record a new incoming payment</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="bg-gradient-primary hover:bg-gradient-primary/90" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>Enter the payment information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerId">Customer</Label>
              <Select 
                value={paymentData.customerId} 
                onValueChange={(value) => setPaymentData({...paymentData, customerId: value, invoiceId: ""})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} {customer.company && `(${customer.company})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="invoiceId">Link to Invoice (Optional)</Label>
              <Select 
                value={paymentData.invoiceId} 
                onValueChange={(value) => setPaymentData({...paymentData, invoiceId: value})}
                disabled={!paymentData.customerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice" />
                </SelectTrigger>
                <SelectContent>
                  {invoices?.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - ₹{invoice.total_amount}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentNumber">Payment Number</Label>
              <Input
                id="paymentNumber"
                value={paymentData.paymentNumber}
                onChange={(e) => setPaymentData({...paymentData, paymentNumber: e.target.value})}
                placeholder="PAY-001"
              />
            </div>
            <div>
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentData.paymentDate}
                onChange={(e) => setPaymentData({...paymentData, paymentDate: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select 
                value={paymentData.paymentMethod} 
                onValueChange={(value) => setPaymentData({...paymentData, paymentMethod: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
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
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                value={paymentData.reference}
                onChange={(e) => setPaymentData({...paymentData, reference: e.target.value})}
                placeholder="Transaction reference"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={paymentData.notes}
              onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
              placeholder="Additional notes about this payment"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
