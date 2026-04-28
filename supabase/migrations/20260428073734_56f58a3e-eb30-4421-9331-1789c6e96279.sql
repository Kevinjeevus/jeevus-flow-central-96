
-- Function: apply stock change for a sales invoice item
CREATE OR REPLACE FUNCTION public.sync_stock_on_sales_invoice_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_stock INTEGER;
  v_new_stock INTEGER;
  v_delta INTEGER; -- positive means more sold (reduce stock)
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT stock_quantity INTO v_prev_stock FROM products WHERE id = NEW.product_id FOR UPDATE;
    IF v_prev_stock IS NULL THEN
      RETURN NEW;
    END IF;
    v_new_stock := v_prev_stock - COALESCE(NEW.quantity, 0);
    UPDATE products SET stock_quantity = v_new_stock, updated_at = now() WHERE id = NEW.product_id;

    INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_stock, new_stock, description, transaction_date)
    VALUES (NEW.product_id, 'sale', COALESCE(NEW.quantity,0), v_prev_stock, v_new_stock, 'Sales invoice item', CURRENT_DATE);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_delta := COALESCE(NEW.quantity,0) - COALESCE(OLD.quantity,0);

    IF NEW.product_id = OLD.product_id THEN
      IF v_delta <> 0 THEN
        SELECT stock_quantity INTO v_prev_stock FROM products WHERE id = NEW.product_id FOR UPDATE;
        v_new_stock := v_prev_stock - v_delta;
        UPDATE products SET stock_quantity = v_new_stock, updated_at = now() WHERE id = NEW.product_id;

        INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_stock, new_stock, description, transaction_date)
        VALUES (NEW.product_id, 'sale_adjust', v_delta, v_prev_stock, v_new_stock, 'Sales invoice item updated', CURRENT_DATE);
      END IF;
    ELSE
      -- product changed: restore old, deduct new
      SELECT stock_quantity INTO v_prev_stock FROM products WHERE id = OLD.product_id FOR UPDATE;
      v_new_stock := v_prev_stock + COALESCE(OLD.quantity,0);
      UPDATE products SET stock_quantity = v_new_stock, updated_at = now() WHERE id = OLD.product_id;
      INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_stock, new_stock, description, transaction_date)
      VALUES (OLD.product_id, 'sale_revert', COALESCE(OLD.quantity,0), v_prev_stock, v_new_stock, 'Sales invoice item product changed', CURRENT_DATE);

      SELECT stock_quantity INTO v_prev_stock FROM products WHERE id = NEW.product_id FOR UPDATE;
      v_new_stock := v_prev_stock - COALESCE(NEW.quantity,0);
      UPDATE products SET stock_quantity = v_new_stock, updated_at = now() WHERE id = NEW.product_id;
      INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_stock, new_stock, description, transaction_date)
      VALUES (NEW.product_id, 'sale', COALESCE(NEW.quantity,0), v_prev_stock, v_new_stock, 'Sales invoice item product changed', CURRENT_DATE);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    SELECT stock_quantity INTO v_prev_stock FROM products WHERE id = OLD.product_id FOR UPDATE;
    IF v_prev_stock IS NULL THEN
      RETURN OLD;
    END IF;
    v_new_stock := v_prev_stock + COALESCE(OLD.quantity,0);
    UPDATE products SET stock_quantity = v_new_stock, updated_at = now() WHERE id = OLD.product_id;

    INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_stock, new_stock, description, transaction_date)
    VALUES (OLD.product_id, 'sale_revert', COALESCE(OLD.quantity,0), v_prev_stock, v_new_stock, 'Sales invoice item removed', CURRENT_DATE);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_stock_sales_invoice_items ON public.sales_invoice_items;
CREATE TRIGGER trg_sync_stock_sales_invoice_items
AFTER INSERT OR UPDATE OR DELETE ON public.sales_invoice_items
FOR EACH ROW EXECUTE FUNCTION public.sync_stock_on_sales_invoice_item();
