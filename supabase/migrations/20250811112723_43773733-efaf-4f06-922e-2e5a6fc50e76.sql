-- 1) Create purchase_bills table
CREATE TABLE IF NOT EXISTS public.purchase_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL,
  user_id UUID NOT NULL,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  bill_number TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_bills ENABLE ROW LEVEL SECURITY;

-- Policies similar to sales_invoices
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_bills' AND policyname = 'Admins can view all purchase bills'
  ) THEN
    CREATE POLICY "Admins can view all purchase bills"
    ON public.purchase_bills
    FOR SELECT
    USING (is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_bills' AND policyname = 'Users can view their purchase bills'
  ) THEN
    CREATE POLICY "Users can view their purchase bills"
    ON public.purchase_bills
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_bills' AND policyname = 'Users can create purchase bills'
  ) THEN
    CREATE POLICY "Users can create purchase bills"
    ON public.purchase_bills
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_bills' AND policyname = 'Users can update their purchase bills'
  ) THEN
    CREATE POLICY "Users can update their purchase bills"
    ON public.purchase_bills
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_bills' AND policyname = 'Users can delete their purchase bills'
  ) THEN
    CREATE POLICY "Users can delete their purchase bills"
    ON public.purchase_bills
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_purchase_bills_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_purchase_bills_updated_at
    BEFORE UPDATE ON public.purchase_bills
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 2) Create purchase_bill_items table
CREATE TABLE IF NOT EXISTS public.purchase_bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_bill_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  gst_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_bill_items ENABLE ROW LEVEL SECURITY;

-- Policies referencing parent record's user_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_bill_items' AND policyname = 'Users can view their purchase bill items'
  ) THEN
    CREATE POLICY "Users can view their purchase bill items"
    ON public.purchase_bill_items
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.purchase_bills b
        WHERE b.id = purchase_bill_id AND b.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_bill_items' AND policyname = 'Users can manage their purchase bill items'
  ) THEN
    CREATE POLICY "Users can manage their purchase bill items"
    ON public.purchase_bill_items
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.purchase_bills b
        WHERE b.id = purchase_bill_id AND b.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- 3) Add purchase_bill_prefix to transaction_prefixes for numbering consistency
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transaction_prefixes' AND column_name = 'purchase_bill_prefix'
  ) THEN
    ALTER TABLE public.transaction_prefixes
    ADD COLUMN purchase_bill_prefix TEXT;
  END IF;
END $$;
