-- Add foreign key constraint between stock_transactions and products
ALTER TABLE public.stock_transactions 
ADD CONSTRAINT fk_stock_transactions_product_id 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;