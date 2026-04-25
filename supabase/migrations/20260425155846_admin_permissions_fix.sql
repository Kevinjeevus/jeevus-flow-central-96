-- Fix Admin permissions for various tables
-- Sales Invoices
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales_invoices' AND policyname = 'Admins can update all sales invoices') THEN
    CREATE POLICY "Admins can update all sales invoices" ON public.sales_invoices FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales_invoices' AND policyname = 'Admins can delete any sales invoices') THEN
    CREATE POLICY "Admins can delete any sales invoices" ON public.sales_invoices FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Sales Invoice Items
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales_invoice_items' AND policyname = 'Admins can manage any sales invoice items') THEN
    CREATE POLICY "Admins can manage any sales invoice items" ON public.sales_invoice_items FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Purchase Bills
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_bills' AND policyname = 'Admins can update all purchase bills') THEN
    CREATE POLICY "Admins can update all purchase bills" ON public.purchase_bills FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_bills' AND policyname = 'Admins can delete any purchase bills') THEN
    CREATE POLICY "Admins can delete any purchase bills" ON public.purchase_bills FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Purchase Bill Items
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_bill_items' AND policyname = 'Admins can manage any purchase bill items') THEN
    CREATE POLICY "Admins can manage any purchase bill items" ON public.purchase_bill_items FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Sales Orders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales_orders' AND policyname = 'Admins can manage all sales orders') THEN
    CREATE POLICY "Admins can manage all sales orders" ON public.sales_orders FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Sales Order Items
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales_order_items' AND policyname = 'Admins can manage all sales order items') THEN
    CREATE POLICY "Admins can manage all sales order items" ON public.sales_order_items FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
END $$;
