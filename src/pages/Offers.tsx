import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Copy, Gift, Percent, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";

interface Offer {
  id: string;
  name: string;
  description: string;
  offer_type: 'discount' | 'gift' | 'coupon';
  condition_type: 'product_qty' | 'invoice_total' | 'coupon_code';
  action_type: 'percentage_off' | 'fixed_discount' | 'free_product';
  min_product_qty?: number;
  min_invoice_amount?: number;
  discount_percentage?: number;
  discount_amount?: number;
  coupon_code?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  current_usage_count: number;
  max_total_usage?: number;
}

export default function Offers() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("discounts");

  useEffect(() => {
    if (user) {
      fetchOffers();
    }
  }, [user]);

  const fetchOffers = async () => {
    try {
      // Mock data for now since the offers table types are not yet available
      const mockOffers: Offer[] = [
        {
          id: '1',
          name: 'Summer Sale',
          description: 'Get 10% off on orders above ₹5000',
          offer_type: 'discount',
          condition_type: 'invoice_total',
          action_type: 'percentage_off',
          min_invoice_amount: 5000,
          discount_percentage: 10,
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          is_active: true,
          current_usage_count: 25,
          max_total_usage: 100,
        },
      ];
      setOffers(mockOffers);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast.error('Failed to fetch offers');
    } finally {
      setLoading(false);
    }
  };

  const getOffersByType = (type: string) => {
    return offers.filter(offer => offer.offer_type === type);
  };

  const getOfferIcon = (type: string) => {
    switch (type) {
      case 'discount': return <Percent className="h-4 w-4" />;
      case 'gift': return <Gift className="h-4 w-4" />;
      case 'coupon': return <Tag className="h-4 w-4" />;
      default: return <Percent className="h-4 w-4" />;
    }
  };

  const getConditionText = (offer: Offer) => {
    switch (offer.condition_type) {
      case 'product_qty':
        return `Min quantity: ${offer.min_product_qty}`;
      case 'invoice_total':
        return `Min amount: ₹${offer.min_invoice_amount}`;
      case 'coupon_code':
        return `Code: ${offer.coupon_code}`;
      default:
        return '';
    }
  };

  const getActionText = (offer: Offer) => {
    switch (offer.action_type) {
      case 'percentage_off':
        return `${offer.discount_percentage}% off`;
      case 'fixed_discount':
        return `₹${offer.discount_amount} off`;
      case 'free_product':
        return 'Free product';
      default:
        return '';
    }
  };

  const handleCreateOffer = (type: string) => {
    toast.info(`Create ${type} functionality will be implemented`);
  };

  const handleEditOffer = (offer: Offer) => {
    toast.info(`Edit ${offer.name} functionality will be implemented`);
  };

  const handleDeleteOffer = async (offer: Offer) => {
    if (!confirm(`Are you sure you want to delete "${offer.name}"?`)) return;

    try {
      // Mock delete for now
      toast.success('Offer deleted successfully');
      fetchOffers();
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast.error('Failed to delete offer');
    }
  };

  const toggleOfferStatus = async (offer: Offer) => {
    try {
      // Mock toggle for now
      toast.success(`Offer ${offer.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchOffers();
    } catch (error) {
      console.error('Error updating offer:', error);
      toast.error('Failed to update offer');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading offers...</div>;
  }

  const renderOfferCard = (offer: Offer) => (
    <Card key={offer.id} className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          {getOfferIcon(offer.offer_type)}
          <CardTitle className="text-base">{offer.name}</CardTitle>
          <Badge variant={offer.is_active ? "default" : "secondary"}>
            {offer.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="flex space-x-1">
          <Button size="sm" variant="ghost" onClick={() => handleEditOffer(offer)}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDeleteOffer(offer)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-2">{offer.description}</CardDescription>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{getConditionText(offer)}</span>
          <span>{getActionText(offer)}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Used: {offer.current_usage_count}/{offer.max_total_usage || '∞'}</span>
          <span>Valid till: {offer.end_date || 'No expiry'}</span>
        </div>
        <div className="mt-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => toggleOfferStatus(offer)}
          >
            {offer.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Offers Management</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="discounts" className="flex items-center space-x-2">
            <Percent className="h-4 w-4" />
            <span>Discounts</span>
          </TabsTrigger>
          <TabsTrigger value="gifts" className="flex items-center space-x-2">
            <Gift className="h-4 w-4" />
            <span>Gifts</span>
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex items-center space-x-2">
            <Tag className="h-4 w-4" />
            <span>Coupons</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discounts" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Discounts</h2>
              <p className="text-sm text-muted-foreground">
                Create product-based and invoice-based discounts
              </p>
            </div>
            <Button onClick={() => handleCreateOffer('discount')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Discount
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-3">Product-based Discounts</h3>
              {getOffersByType('discount').filter(o => o.condition_type === 'product_qty').length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  <p>No product-based discounts yet</p>
                  <p className="text-xs mt-1">Create rules like "Buy 10 soaps → 5% off"</p>
                </Card>
              ) : (
                getOffersByType('discount')
                  .filter(o => o.condition_type === 'product_qty')
                  .map(renderOfferCard)
              )}
            </div>

            <div>
              <h3 className="font-medium mb-3">Invoice-based Discounts</h3>
              {getOffersByType('discount').filter(o => o.condition_type === 'invoice_total').length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  <p>No invoice-based discounts yet</p>
                  <p className="text-xs mt-1">Create rules like "Bill above ₹5000 → 10% off"</p>
                </Card>
              ) : (
                getOffersByType('discount')
                  .filter(o => o.condition_type === 'invoice_total')
                  .map(renderOfferCard)
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="gifts" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Gifts</h2>
              <p className="text-sm text-muted-foreground">
                Create BOGO offers and free item gifts
              </p>
            </div>
            <Button onClick={() => handleCreateOffer('gift')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Gift Offer
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-3">Product-based Gifts (BOGO)</h3>
              {getOffersByType('gift').filter(o => o.condition_type === 'product_qty').length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  <p>No product-based gifts yet</p>
                  <p className="text-xs mt-1">Create rules like "Buy 5 Shampoo → Get 1 Conditioner free"</p>
                </Card>
              ) : (
                getOffersByType('gift')
                  .filter(o => o.condition_type === 'product_qty')
                  .map(renderOfferCard)
              )}
            </div>

            <div>
              <h3 className="font-medium mb-3">Invoice-based Gifts</h3>
              {getOffersByType('gift').filter(o => o.condition_type === 'invoice_total').length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  <p>No invoice-based gifts yet</p>
                  <p className="text-xs mt-1">Create rules like "Bill above ₹10,000 → Free bag"</p>
                </Card>
              ) : (
                getOffersByType('gift')
                  .filter(o => o.condition_type === 'invoice_total')
                  .map(renderOfferCard)
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="coupons" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Coupons</h2>
              <p className="text-sm text-muted-foreground">
                Create code-based discount and gift coupons
              </p>
            </div>
            <Button onClick={() => handleCreateOffer('coupon')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Coupon
            </Button>
          </div>

          {getOffersByType('coupon').length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No coupons yet</p>
              <p className="text-xs mt-1">Create discount or gift coupons with unique codes</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getOffersByType('coupon').map(renderOfferCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}