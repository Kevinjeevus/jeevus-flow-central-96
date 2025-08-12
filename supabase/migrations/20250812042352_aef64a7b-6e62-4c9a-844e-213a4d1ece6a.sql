-- 1) Create purchase_returns table
CREATE TABLE IF NOT EXISTS public.purchase_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL,
  user_id UUID NOT NULL,
  original_bill_id UUID,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  debit_note_number TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;

-- Policies similar to sale_returns
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_returns' AND policyname = 'Admins can view all purchase returns'
  ) THEN
    CREATE POLICY "Admins can view all purchase returns"
    ON public.purchase_returns
    FOR SELECT
    USING (is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_returns' AND policyname = 'Users can view their purchase returns'
  ) THEN
    CREATE POLICY "Users can view their purchase returns"
    ON public.purchase_returns
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_returns' AND policyname = 'Users can create purchase returns'
  ) THEN
    CREATE POLICY "Users can create purchase returns"
    ON public.purchase_returns
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_returns' AND policyname = 'Users can update their purchase returns'
  ) THEN
    CREATE POLICY "Users can update their purchase returns"
    ON public.purchase_returns
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_returns' AND policyname = 'Users can delete their purchase returns'
  ) THEN
    CREATE POLICY "Users can delete their purchase returns"
    ON public.purchase_returns
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_purchase_returns_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_purchase_returns_updated_at
    BEFORE UPDATE ON public.purchase_returns
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 2) Create purchase_return_items table
CREATE TABLE IF NOT EXISTS public.purchase_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_return_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  gst_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_return_items ENABLE ROW LEVEL SECURITY;

-- Policies referencing parent record's user_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_return_items' AND policyname = 'Users can view their purchase return items'
  ) THEN
    CREATE POLICY "Users can view their purchase return items"
    ON public.purchase_return_items
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.purchase_returns pr
        WHERE pr.id = purchase_return_id AND pr.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_return_items' AND policyname = 'Users can manage their purchase return items'
  ) THEN
    CREATE POLICY "Users can manage their purchase return items"
    ON public.purchase_return_items
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.purchase_returns pr
        WHERE pr.id = purchase_return_id AND pr.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- 3) Add purchase_return_prefix to transaction_prefixes if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transaction_prefixes' AND column_name = 'purchase_return_prefix'
  ) THEN
    ALTER TABLE public.transaction_prefixes
    ADD COLUMN purchase_return_prefix TEXT;
  END IF;
END $$;