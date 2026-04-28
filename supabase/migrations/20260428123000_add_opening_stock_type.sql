-- Add 'opening_stock' to allowed transaction types
ALTER TABLE public.stock_transactions DROP CONSTRAINT IF EXISTS stock_transactions_transaction_type_check;
ALTER TABLE public.stock_transactions ADD CONSTRAINT stock_transactions_transaction_type_check
  CHECK (transaction_type = ANY (ARRAY['add','reduce','sale','sale_adjust','sale_revert','purchase','purchase_return','adjustment','opening_stock']));
