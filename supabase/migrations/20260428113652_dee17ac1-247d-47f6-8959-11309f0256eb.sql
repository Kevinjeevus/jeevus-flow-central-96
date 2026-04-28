-- Add reference columns to stock_transactions to link to source documents (e.g., sales invoices)
ALTER TABLE public.stock_transactions
  ADD COLUMN IF NOT EXISTS reference_type text,
  ADD COLUMN IF NOT EXISTS reference_id uuid;

CREATE INDEX IF NOT EXISTS idx_stock_transactions_reference
  ON public.stock_transactions(reference_type, reference_id);

-- Update the trigger function to populate reference_type/reference_id with the sales_invoice id
CREATE OR REPLACE FUNCTION public.sync_stock_on_sales_invoice_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prev_stock INTEGER;
  v_new_stock INTEGER;
  v_delta INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT stock_quantity INTO v_prev_stock FROM products WHERE id = NEW.product_id FOR UPDATE;
    IF v_prev_stock IS NULL THEN
      RETURN NEW;
    END IF;
    v_new_stock := v_prev_stock - COALESCE(NEW.quantity, 0);
    UPDATE products SET stock_quantity = v_new_stock, updated_at = now() WHERE id = NEW.product_id;

    INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_stock, new_stock, description, transaction_date, reference_type, reference_id)
    VALUES (NEW.product_id, 'sale', COALESCE(NEW.quantity,0), v_prev_stock, v_new_stock, 'Sales invoice item', CURRENT_DATE, 'sales_invoice', NEW.sales_invoice_id);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_delta := COALESCE(NEW.quantity,0) - COALESCE(OLD.quantity,0);

    IF NEW.product_id = OLD.product_id THEN
      IF v_delta <> 0 THEN
        SELECT stock_quantity INTO v_prev_stock FROM products WHERE id = NEW.product_id FOR UPDATE;
        v_new_stock := v_prev_stock - v_delta;
        UPDATE products SET stock_quantity = v_new_stock, updated_at = now() WHERE id = NEW.product_id;

        INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_stock, new_stock, description, transaction_date, reference_type, reference_id)
        VALUES (NEW.product_id, 'sale_adjust', v_delta, v_prev_stock, v_new_stock, 'Sales invoice item updated', CURRENT_DATE, 'sales_invoice', NEW.sales_invoice_id);
      END IF;
    ELSE
      SELECT stock_quantity INTO v_prev_stock FROM products WHERE id = OLD.product_id FOR UPDATE;
      v_new_stock := v_prev_stock + COALESCE(OLD.quantity,0);
      UPDATE products SET stock_quantity = v_new_stock, updated_at = now() WHERE id = OLD.product_id;
      INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_stock, new_stock, description, transaction_date, reference_type, reference_id)
      VALUES (OLD.product_id, 'sale_revert', COALESCE(OLD.quantity,0), v_prev_stock, v_new_stock, 'Sales invoice item product changed', CURRENT_DATE, 'sales_invoice', OLD.sales_invoice_id);

      SELECT stock_quantity INTO v_prev_stock FROM products WHERE id = NEW.product_id FOR UPDATE;
      v_new_stock := v_prev_stock - COALESCE(NEW.quantity,0);
      UPDATE products SET stock_quantity = v_new_stock, updated_at = now() WHERE id = NEW.product_id;
      INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_stock, new_stock, description, transaction_date, reference_type, reference_id)
      VALUES (NEW.product_id, 'sale', COALESCE(NEW.quantity,0), v_prev_stock, v_new_stock, 'Sales invoice item product changed', CURRENT_DATE, 'sales_invoice', NEW.sales_invoice_id);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    SELECT stock_quantity INTO v_prev_stock FROM products WHERE id = OLD.product_id FOR UPDATE;
    IF v_prev_stock IS NULL THEN
      RETURN OLD;
    END IF;
    v_new_stock := v_prev_stock + COALESCE(OLD.quantity,0);
    UPDATE products SET stock_quantity = v_new_stock, updated_at = now() WHERE id = OLD.product_id;

    INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_stock, new_stock, description, transaction_date, reference_type, reference_id)
    VALUES (OLD.product_id, 'sale_revert', COALESCE(OLD.quantity,0), v_prev_stock, v_new_stock, 'Sales invoice item removed', CURRENT_DATE, 'sales_invoice', OLD.sales_invoice_id);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$function$;

-- Backfill reference_id for existing rows created from the trigger
-- Match by description = 'Sales invoice item' and an item with the same product
-- Better: match using the backfill marker that contains the item id
UPDATE public.stock_transactions st
SET reference_type = 'sales_invoice',
    reference_id = sii.sales_invoice_id
FROM public.sales_invoice_items sii
WHERE st.reference_id IS NULL
  AND st.description = 'Backfill sales invoice item ' || sii.id::text;

-- Backfill remaining rows by joining on product_id and date proximity for "Sales invoice item" rows
UPDATE public.stock_transactions st
SET reference_type = 'sales_invoice',
    reference_id = si.id
FROM public.sales_invoice_items sii
JOIN public.sales_invoices si ON si.id = sii.sales_invoice_id
WHERE st.reference_id IS NULL
  AND st.description LIKE 'Sales invoice item%'
  AND st.product_id = sii.product_id
  AND st.quantity = sii.quantity
  AND st.transaction_date = si.invoice_date;