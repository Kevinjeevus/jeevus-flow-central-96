-- Allow sale-related transaction types
ALTER TABLE public.stock_transactions DROP CONSTRAINT IF EXISTS stock_transactions_transaction_type_check;
ALTER TABLE public.stock_transactions ADD CONSTRAINT stock_transactions_transaction_type_check
  CHECK (transaction_type = ANY (ARRAY['add','reduce','sale','sale_adjust','sale_revert','purchase','purchase_return','adjustment']));

-- Backfill stock for all existing sales invoice items not yet synced
DO $$
DECLARE
  r RECORD;
  v_prev INTEGER;
  v_new INTEGER;
BEGIN
  FOR r IN
    SELECT sii.id AS item_id, sii.product_id, sii.quantity, si.invoice_date
    FROM sales_invoice_items sii
    JOIN sales_invoices si ON si.id = sii.sales_invoice_id
    WHERE sii.product_id IS NOT NULL
      AND COALESCE(sii.quantity,0) > 0
      AND NOT EXISTS (
        SELECT 1 FROM stock_transactions st
        WHERE st.product_id = sii.product_id
          AND st.transaction_type IN ('sale','sale_adjust')
          AND st.description = 'Backfill sales invoice item ' || sii.id::text
      )
    ORDER BY si.invoice_date, sii.created_at
  LOOP
    SELECT stock_quantity INTO v_prev FROM products WHERE id = r.product_id FOR UPDATE;
    IF v_prev IS NULL THEN
      CONTINUE;
    END IF;
    v_new := v_prev - r.quantity;
    UPDATE products SET stock_quantity = v_new, updated_at = now() WHERE id = r.product_id;
    INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_stock, new_stock, description, transaction_date)
    VALUES (r.product_id, 'sale', r.quantity, v_prev, v_new, 'Backfill sales invoice item ' || r.item_id::text, r.invoice_date);
  END LOOP;
END $$;