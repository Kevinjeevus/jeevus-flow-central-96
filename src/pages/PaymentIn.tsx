
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PaymentForm } from "@/components/PaymentForm";
import { ErpLayout } from "@/components/ErpLayout";

export default function PaymentIn() {
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  if (showPaymentForm) {
    return <PaymentForm onClose={() => setShowPaymentForm(false)} />;
  }

  return (
    <ErpLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payment In</h1>
            <p className="text-muted-foreground">Track and manage incoming payments</p>
          </div>
          <Button 
            className="bg-gradient-primary hover:bg-gradient-primary/90"
            onClick={() => setShowPaymentForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Search payments..." 
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Incoming Payments
            </CardTitle>
            <CardDescription>
              Monitor all payments received from customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payments found</p>
              <p className="text-sm">Record your first payment to get started</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErpLayout>
  );
}
