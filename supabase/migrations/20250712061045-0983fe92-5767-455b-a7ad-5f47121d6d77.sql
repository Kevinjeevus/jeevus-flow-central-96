-- Create routes table for admin to manage routes
CREATE TABLE public.routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user sessions/attendance table
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  route_id UUID NOT NULL REFERENCES public.routes(id),
  login_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  logout_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales invoices table
CREATE TABLE public.sales_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  user_id UUID NOT NULL,
  route_id UUID REFERENCES public.routes(id),
  session_id UUID REFERENCES public.user_sessions(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales invoice items table
CREATE TABLE public.sales_invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoice_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for routes
CREATE POLICY "Authenticated users can view routes" 
ON public.routes 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can manage routes" 
ON public.routes 
FOR ALL 
USING (auth.role() = 'authenticated'::text);

-- Create RLS policies for user_sessions
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" 
ON public.user_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON public.user_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for sales_invoices
CREATE POLICY "Users can view invoices from their sessions" 
ON public.sales_invoices 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create invoices" 
ON public.sales_invoices 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices" 
ON public.sales_invoices 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for sales_invoice_items
CREATE POLICY "Users can view their invoice items" 
ON public.sales_invoice_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.sales_invoices 
  WHERE id = sales_invoice_id AND user_id = auth.uid()
));

CREATE POLICY "Users can manage their invoice items" 
ON public.sales_invoice_items 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.sales_invoices 
  WHERE id = sales_invoice_id AND user_id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_route_id ON public.user_sessions(route_id);
CREATE INDEX idx_user_sessions_status ON public.user_sessions(status);
CREATE INDEX idx_sales_invoices_customer_id ON public.sales_invoices(customer_id);
CREATE INDEX idx_sales_invoices_user_id ON public.sales_invoices(user_id);
CREATE INDEX idx_sales_invoices_route_id ON public.sales_invoices(route_id);
CREATE INDEX idx_sales_invoices_session_id ON public.sales_invoices(session_id);

-- Create triggers for updating timestamps
CREATE TRIGGER update_routes_updated_at
BEFORE UPDATE ON public.routes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at
BEFORE UPDATE ON public.user_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_invoices_updated_at
BEFORE UPDATE ON public.sales_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();