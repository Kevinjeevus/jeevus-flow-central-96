-- Create offers system tables

-- Main offers table
CREATE TABLE public.offers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    offer_type TEXT NOT NULL CHECK (offer_type IN ('discount', 'gift', 'coupon')),
    condition_type TEXT NOT NULL CHECK (condition_type IN ('product_qty', 'invoice_total', 'coupon_code')),
    action_type TEXT NOT NULL CHECK (action_type IN ('percentage_off', 'fixed_discount', 'free_product')),
    
    -- Condition parameters
    min_product_qty INTEGER,
    min_invoice_amount NUMERIC(10,2),
    target_product_ids UUID[],
    coupon_code TEXT UNIQUE,
    
    -- Action parameters
    discount_percentage NUMERIC(5,2),
    discount_amount NUMERIC(10,2),
    free_product_id UUID,
    free_product_qty INTEGER DEFAULT 1,
    
    -- Validity and limits
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    max_usage_per_customer INTEGER,
    max_total_usage INTEGER,
    current_usage_count INTEGER DEFAULT 0,
    
    -- Priority for multiple offers
    priority INTEGER DEFAULT 1,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_by UUID,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Offer usage tracking
CREATE TABLE public.offer_usages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    offer_id UUID NOT NULL,
    customer_id UUID,
    invoice_id UUID,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    discount_applied NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Applied offers on invoices (for tracking what offers were used)
CREATE TABLE public.invoice_offers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL,
    offer_id UUID NOT NULL,
    offer_type TEXT NOT NULL,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    free_product_id UUID,
    free_product_qty INTEGER DEFAULT 0,
    coupon_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for offers
CREATE POLICY "Users can view their offers" ON public.offers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create offers" ON public.offers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their offers" ON public.offers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their offers" ON public.offers FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for offer_usages
CREATE POLICY "Users can view their offer usages" ON public.offer_usages FOR SELECT USING (
    EXISTS (SELECT 1 FROM offers WHERE offers.id = offer_usages.offer_id AND offers.user_id = auth.uid())
);
CREATE POLICY "Users can create offer usages" ON public.offer_usages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM offers WHERE offers.id = offer_usages.offer_id AND offers.user_id = auth.uid())
);

-- RLS Policies for invoice_offers
CREATE POLICY "Users can view their invoice offers" ON public.invoice_offers FOR SELECT USING (
    EXISTS (SELECT 1 FROM sales_invoices WHERE sales_invoices.id = invoice_offers.invoice_id AND sales_invoices.user_id = auth.uid())
);
CREATE POLICY "Users can create invoice offers" ON public.invoice_offers FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sales_invoices WHERE sales_invoices.id = invoice_offers.invoice_id AND sales_invoices.user_id = auth.uid())
);

-- Create indexes for performance
CREATE INDEX idx_offers_user_id ON public.offers(user_id);
CREATE INDEX idx_offers_type ON public.offers(offer_type);
CREATE INDEX idx_offers_active ON public.offers(is_active);
CREATE INDEX idx_offers_coupon_code ON public.offers(coupon_code) WHERE coupon_code IS NOT NULL;
CREATE INDEX idx_offer_usages_offer_id ON public.offer_usages(offer_id);
CREATE INDEX idx_invoice_offers_invoice_id ON public.invoice_offers(invoice_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_offers_updated_at
    BEFORE UPDATE ON public.offers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create products table if it doesn't exist (for offer system)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    sku TEXT UNIQUE,
    category_id UUID,
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage products" ON public.products FOR ALL USING (auth.role() = 'authenticated');