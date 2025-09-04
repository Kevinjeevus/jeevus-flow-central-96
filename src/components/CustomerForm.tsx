import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

interface CustomerFormProps {
  onClose: () => void;
  onSuccess?: (customer?: any) => void;
  initialName?: string;
}

export function CustomerForm({ onClose, onSuccess, initialName = "" }: CustomerFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const [customerData, setCustomerData] = useState({
    name: initialName,
    company: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gstin: "",
    credit_limit: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerData.name.trim()) {
      toast({
        title: "Error",
        description: "Customer name is required",
        variant: "destructive",
      });
      return;
    }

    if (!customerData.phone.trim()) {
      toast({
        title: "Error",
        description: "Phone number is required",
        variant: "destructive",
      });
      return;
    }

    if (!customerData.address.trim()) {
      toast({
        title: "Error",
        description: "Address is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          name: customerData.name.trim(),
          company: customerData.company.trim() || null,
          email: customerData.email.trim() || null,
          phone: customerData.phone.trim(),
          address: customerData.address.trim(),
          city: customerData.city.trim() || null,
          state: customerData.state.trim() || null,
          pincode: customerData.pincode.trim() || null,
          gstin: customerData.gstin.trim() || null,
          credit_limit: customerData.credit_limit ? parseFloat(customerData.credit_limit) : null,
          created_by: user?.id,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer created successfully!",
      });
      
      onSuccess?.(newCustomer);
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3 sm:space-y-6 px-1 sm:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Add New Customer</h2>
          <p className="text-muted-foreground text-sm sm:text-base">Add a customer to your route</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} size="sm">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Customer's primary details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  value={customerData.name}
                  onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  value={customerData.company}
                  onChange={(e) => setCustomerData({...customerData, company: e.target.value})}
                  placeholder="Enter company name (optional)"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerData.email}
                  onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={customerData.phone}
                  onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address & Business Details</CardTitle>
              <CardDescription>Location and business information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  value={customerData.address}
                  onChange={(e) => setCustomerData({...customerData, address: e.target.value})}
                  placeholder="Enter complete address"
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={customerData.city}
                    onChange={(e) => setCustomerData({...customerData, city: e.target.value})}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={customerData.state}
                    onChange={(e) => setCustomerData({...customerData, state: e.target.value})}
                    placeholder="State"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    value={customerData.pincode}
                    onChange={(e) => setCustomerData({...customerData, pincode: e.target.value})}
                    placeholder="Pincode"
                  />
                </div>
                <div>
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    value={customerData.gstin}
                    onChange={(e) => setCustomerData({...customerData, gstin: e.target.value})}
                    placeholder="GST Number"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="credit_limit">Credit Limit</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  value={customerData.credit_limit}
                  onChange={(e) => setCustomerData({...customerData, credit_limit: e.target.value})}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button 
            type="submit" 
            className="bg-gradient-primary hover:bg-gradient-primary/90 w-full sm:w-auto"
            disabled={isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Creating Customer..." : "Create Customer"}
          </Button>
        </div>
      </form>
    </div>
  );
}