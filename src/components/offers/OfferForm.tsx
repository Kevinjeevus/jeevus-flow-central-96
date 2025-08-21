import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";

const offerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  offer_type: z.enum(["discount", "gift", "coupon"]),
  condition_type: z.enum(["product_qty", "invoice_total", "coupon_code"]),
  action_type: z.enum(["percentage_off", "fixed_discount", "free_product"]),
  
  // Condition parameters
  min_product_qty: z.number().optional(),
  min_invoice_amount: z.number().optional(),
  coupon_code: z.string().optional(),
  
  // Action parameters
  discount_percentage: z.number().min(0).max(100).optional(),
  discount_amount: z.number().min(0).optional(),
  free_product_id: z.string().optional(),
  free_product_qty: z.number().min(1).optional(),
  
  // Validity and limits
  start_date: z.date(),
  end_date: z.date().optional(),
  max_usage_per_customer: z.number().optional(),
  max_total_usage: z.number().optional(),
  priority: z.number().min(1).default(1),
  is_active: z.boolean().default(true),
});

type OfferFormData = z.infer<typeof offerFormSchema>;

interface OfferFormProps {
  onSubmit: (data: OfferFormData) => void;
  onCancel: () => void;
  initialData?: Partial<OfferFormData>;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

export function OfferForm({ onSubmit, onCancel, initialData }: OfferFormProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<OfferFormData>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      name: "",
      description: "",
      offer_type: "discount",
      condition_type: "product_qty",
      action_type: "percentage_off",
      start_date: new Date(),
      priority: 1,
      is_active: true,
      free_product_qty: 1,
      ...initialData,
    },
  });

  const watchOfferType = form.watch("offer_type");
  const watchConditionType = form.watch("condition_type");
  const watchActionType = form.watch("action_type");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // Mock products for now
      const mockProducts: Product[] = [
        { id: '1', name: 'Shampoo', price: 250 },
        { id: '2', name: 'Conditioner', price: 200 },
        { id: '3', name: 'Soap', price: 50 },
        { id: '4', name: 'Bag', price: 500 },
      ];
      setProducts(mockProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSubmit = async (data: OfferFormData) => {
    setLoading(true);
    try {
      // Validation based on offer type and condition
      if (data.condition_type === 'coupon_code' && !data.coupon_code) {
        toast.error('Coupon code is required for coupon-based offers');
        return;
      }

      if (data.condition_type === 'product_qty' && !data.min_product_qty) {
        toast.error('Minimum product quantity is required');
        return;
      }

      if (data.condition_type === 'invoice_total' && !data.min_invoice_amount) {
        toast.error('Minimum invoice amount is required');
        return;
      }

      if (data.action_type === 'percentage_off' && !data.discount_percentage) {
        toast.error('Discount percentage is required');
        return;
      }

      if (data.action_type === 'fixed_discount' && !data.discount_amount) {
        toast.error('Discount amount is required');
        return;
      }

      if (data.action_type === 'free_product' && !data.free_product_id) {
        toast.error('Free product selection is required');
        return;
      }

      onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Offer</CardTitle>
        <CardDescription>
          Set up discounts, gifts, or coupons for your customers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Offer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Summer Sale 2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe your offer..."
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Offer Type */}
            <FormField
              control={form.control}
              name="offer_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Offer Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select offer type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="discount">Discount</SelectItem>
                      <SelectItem value="gift">Gift</SelectItem>
                      <SelectItem value="coupon">Coupon</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Condition Type */}
            <FormField
              control={form.control}
              name="condition_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {watchOfferType !== 'coupon' && (
                        <>
                          <SelectItem value="product_qty">Product Quantity</SelectItem>
                          <SelectItem value="invoice_total">Invoice Total</SelectItem>
                        </>
                      )}
                      {watchOfferType === 'coupon' && (
                        <SelectItem value="coupon_code">Coupon Code</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Condition Parameters */}
            {watchConditionType === 'product_qty' && (
              <FormField
                control={form.control}
                name="min_product_qty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Product Quantity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g., 10"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchConditionType === 'invoice_total' && (
              <FormField
                control={form.control}
                name="min_invoice_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Invoice Amount (₹)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g., 5000"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchConditionType === 'coupon_code' && (
              <FormField
                control={form.control}
                name="coupon_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coupon Code</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., SUMMER2024"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Action Type */}
            <FormField
              control={form.control}
              name="action_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select action type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="percentage_off">Percentage Off</SelectItem>
                      <SelectItem value="fixed_discount">Fixed Discount</SelectItem>
                      <SelectItem value="free_product">Free Product</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Parameters */}
            {watchActionType === 'percentage_off' && (
              <FormField
                control={form.control}
                name="discount_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Percentage (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        max="100"
                        placeholder="e.g., 10"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchActionType === 'fixed_discount' && (
              <FormField
                control={form.control}
                name="discount_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Amount (₹)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        placeholder="e.g., 500"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchActionType === 'free_product' && (
              <>
                <FormField
                  control={form.control}
                  name="free_product_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Free Product</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select free product" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - ₹{product.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="free_product_qty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Free Product Quantity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          placeholder="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Validity Period */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>No expiry</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Usage Limits */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="max_usage_per_customer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Uses Per Customer</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        placeholder="Unlimited"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_total_usage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Total Uses</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        placeholder="Unlimited"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Priority and Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Offer"}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}