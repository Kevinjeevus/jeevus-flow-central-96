-- Create table for company settings (Print Company Info / Header)
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'Company Name',
  company_logo_url TEXT,
  address TEXT,
  email TEXT,
  phone_number TEXT,
  gstin TEXT,
  make_regular_printer_default BOOLEAN DEFAULT false,
  print_repeat_header BOOLEAN DEFAULT false,
  paper_size TEXT DEFAULT 'A4',
  orientation TEXT DEFAULT 'Portrait',
  company_name_text_size TEXT DEFAULT 'Large',
  invoice_text_size TEXT DEFAULT 'Medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create table for transaction prefixes
CREATE TABLE public.transaction_prefixes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_name TEXT NOT NULL DEFAULT 'JEEVUS NATURALS',
  sale_prefix TEXT DEFAULT 'INV/',
  credit_note_prefix TEXT,
  sale_order_prefix TEXT,
  purchase_order_prefix TEXT,
  estimate_prefix TEXT,
  proforma_invoice_prefix TEXT,
  delivery_challan_prefix TEXT,
  payment_in_prefix TEXT,
  financial_year TEXT DEFAULT '2025-26',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_prefixes ENABLE ROW LEVEL SECURITY;

-- Create policies for company_settings
CREATE POLICY "Authenticated users can manage company settings" 
ON public.company_settings 
FOR ALL 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can view company settings" 
ON public.company_settings 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

-- Create policies for transaction_prefixes
CREATE POLICY "Authenticated users can manage transaction prefixes" 
ON public.transaction_prefixes 
FOR ALL 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can view transaction prefixes" 
ON public.transaction_prefixes 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

-- Create triggers for updated_at
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transaction_prefixes_updated_at
BEFORE UPDATE ON public.transaction_prefixes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();