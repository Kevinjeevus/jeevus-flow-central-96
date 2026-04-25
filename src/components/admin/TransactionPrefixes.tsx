import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { getNumberPadding, setNumberPadding } from "@/lib/numberPadding";

interface TransactionPrefixData {
  id?: string;
  firm_name: string;
  sale_prefix: string;
  credit_note_prefix: string;
  sale_order_prefix: string;
  purchase_order_prefix: string;
  estimate_prefix: string;
  proforma_invoice_prefix: string;
  delivery_challan_prefix: string;
  payment_in_prefix: string;
  financial_year: string;
}

export function TransactionPrefixes() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [padding, setPadding] = useState<number>(getNumberPadding());
  const [prefixes, setPrefixes] = useState<TransactionPrefixData>({
    firm_name: "JEEVUS NATURALS",
    sale_prefix: "INV/",
    credit_note_prefix: "",
    sale_order_prefix: "",
    purchase_order_prefix: "",
    estimate_prefix: "",
    proforma_invoice_prefix: "",
    delivery_challan_prefix: "",
    payment_in_prefix: "",
    financial_year: "25-26"
  });

  useEffect(() => {
    fetchPrefixes();
  }, []);

  const fetchPrefixes = async () => {
    try {
      const { data, error } = await supabase
        .from('transaction_prefixes')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setPrefixes(data);
      }
    } catch (error: any) {
      console.error('Error fetching prefixes:', error);
    }
  };

  const handleInputChange = (field: keyof TransactionPrefixData, value: string) => {
    setPrefixes(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      setNumberPadding(padding);
      const prefixData = {
        ...prefixes,
        created_by: user.id,
        updated_at: new Date().toISOString()
      };

      let query;
      if (prefixes.id) {
        query = supabase
          .from('transaction_prefixes')
          .update(prefixData)
          .eq('id', prefixes.id);
      } else {
        query = supabase
          .from('transaction_prefixes')
          .insert([prefixData]);
      }

      const { error } = await query;
      if (error) throw error;

      toast({
        title: "Success",
        description: "Transaction prefixes saved successfully!",
      });

      // Refetch to get the updated data with ID
      await fetchPrefixes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save prefixes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFullPrefix = (prefix: string) => {
    if (!prefix) return "None";
    return `${prefix}${prefixes.financial_year}/${"0".repeat(padding)}`;
  };

  return (
    <div className="space-y-6">
      {/* Firm Selection */}
      <div className="space-y-2">
        <Label htmlFor="firm-name">Firm</Label>
        <Select 
          value={prefixes.firm_name} 
          onValueChange={(value) => handleInputChange('firm_name', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="JEEVUS NATURALS">JEEVUS NATURALS</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Financial Year */}
      <div className="space-y-2">
        <Label htmlFor="financial-year">Financial Year</Label>
        <Select 
          value={prefixes.financial_year} 
          onValueChange={(value) => handleInputChange('financial_year', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24-25">24-25</SelectItem>
            <SelectItem value="25-26">25-26</SelectItem>
            <SelectItem value="26-27">26-27</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Number Padding (zeros) */}
      <div className="space-y-2">
        <Label htmlFor="number-padding">Number Padding (zeros)</Label>
        <Select
          value={String(padding)}
          onValueChange={(v) => setPadding(parseInt(v, 10))}
        >
          <SelectTrigger id="number-padding">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} digit{n > 1 ? "s" : ""} ({"0".repeat(n)} → {"0".repeat(n - 1)}1)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Controls how many digits the running number is padded to. E.g. padding 3 → INV/{prefixes.financial_year}/001
        </p>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Prefixes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sale-prefix">Sale</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="sale-prefix"
                  value={prefixes.sale_prefix}
                  onChange={(e) => handleInputChange('sale_prefix', e.target.value)}
                  placeholder="Enter prefix (e.g., INV/)"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground min-w-0 flex-shrink-0">
                  {getFullPrefix(prefixes.sale_prefix)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale-order-prefix">Sale Order</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="sale-order-prefix"
                  value={prefixes.sale_order_prefix}
                  onChange={(e) => handleInputChange('sale_order_prefix', e.target.value)}
                  placeholder="Enter prefix"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground min-w-0 flex-shrink-0">
                  {getFullPrefix(prefixes.sale_order_prefix)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimate-prefix">Estimate</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="estimate-prefix"
                  value={prefixes.estimate_prefix}
                  onChange={(e) => handleInputChange('estimate_prefix', e.target.value)}
                  placeholder="Enter prefix"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground min-w-0 flex-shrink-0">
                  {getFullPrefix(prefixes.estimate_prefix)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery-challan-prefix">Delivery Challan</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="delivery-challan-prefix"
                  value={prefixes.delivery_challan_prefix}
                  onChange={(e) => handleInputChange('delivery_challan_prefix', e.target.value)}
                  placeholder="Enter prefix"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground min-w-0 flex-shrink-0">
                  {getFullPrefix(prefixes.delivery_challan_prefix)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="credit-note-prefix">Credit Note</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="credit-note-prefix"
                  value={prefixes.credit_note_prefix}
                  onChange={(e) => handleInputChange('credit_note_prefix', e.target.value)}
                  placeholder="Enter prefix"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground min-w-0 flex-shrink-0">
                  {getFullPrefix(prefixes.credit_note_prefix)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase-order-prefix">Purchase Order</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="purchase-order-prefix"
                  value={prefixes.purchase_order_prefix}
                  onChange={(e) => handleInputChange('purchase_order_prefix', e.target.value)}
                  placeholder="Enter prefix"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground min-w-0 flex-shrink-0">
                  {getFullPrefix(prefixes.purchase_order_prefix)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proforma-invoice-prefix">Proforma Invoice</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="proforma-invoice-prefix"
                  value={prefixes.proforma_invoice_prefix}
                  onChange={(e) => handleInputChange('proforma_invoice_prefix', e.target.value)}
                  placeholder="Enter prefix"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground min-w-0 flex-shrink-0">
                  {getFullPrefix(prefixes.proforma_invoice_prefix)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-in-prefix">Payment In</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="payment-in-prefix"
                  value={prefixes.payment_in_prefix}
                  onChange={(e) => handleInputChange('payment_in_prefix', e.target.value)}
                  placeholder="Enter prefix"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground min-w-0 flex-shrink-0">
                  {getFullPrefix(prefixes.payment_in_prefix)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? "Saving..." : "Save Prefixes"}
        </Button>
      </div>
    </div>
  );
}