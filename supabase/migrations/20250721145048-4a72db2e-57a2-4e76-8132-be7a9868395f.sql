-- Create stock_transactions table to track all stock movements
CREATE TABLE public.stock_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('add', 'reduce')),
  quantity INTEGER NOT NULL,
  batch_number TEXT,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for stock transactions
CREATE POLICY "Authenticated users can view stock transactions" 
ON public.stock_transactions 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can create stock transactions" 
ON public.stock_transactions 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can update stock transactions" 
ON public.stock_transactions 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can delete stock transactions" 
ON public.stock_transactions 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);

-- Add trigger for updated_at
CREATE TRIGGER update_stock_transactions_updated_at
BEFORE UPDATE ON public.stock_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_stock_transactions_product_date ON public.stock_transactions(product_id, transaction_date DESC);
CREATE INDEX idx_stock_transactions_date ON public.stock_transactions(transaction_date DESC);