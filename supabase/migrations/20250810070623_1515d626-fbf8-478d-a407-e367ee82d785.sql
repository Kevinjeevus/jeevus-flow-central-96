-- Create sale_returns table
CREATE TABLE IF NOT EXISTS public.sale_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  user_id uuid NOT NULL,
  original_invoice_id uuid NULL REFERENCES public.sales_invoices(id),
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  notes text NULL,
  credit_note_number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure unique credit note numbers
CREATE UNIQUE INDEX IF NOT EXISTS ux_sale_returns_credit_note_number
  ON public.sale_returns(credit_note_number);

-- Enable RLS
ALTER TABLE public.sale_returns ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sale_returns' AND policyname = 'Admins can view all sale returns'
  ) THEN
    CREATE POLICY "Admins can view all sale returns"
    ON public.sale_returns
    FOR SELECT
    USING (is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sale_returns' AND policyname = 'Users can insert their sale returns'
  ) THEN
    CREATE POLICY "Users can insert their sale returns"
    ON public.sale_returns
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sale_returns' AND policyname = 'Users can update their sale returns'
  ) THEN
    CREATE POLICY "Users can update their sale returns"
    ON public.sale_returns
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sale_returns' AND policyname = 'Users can delete their sale returns'
  ) THEN
    CREATE POLICY "Users can delete their sale returns"
    ON public.sale_returns
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sale_returns' AND policyname = 'Users can view their sale returns'
  ) THEN
    CREATE POLICY "Users can view their sale returns"
    ON public.sale_returns
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_sale_returns_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_sale_returns_updated_at
    BEFORE UPDATE ON public.sale_returns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Create sale_return_items table
CREATE TABLE IF NOT EXISTS public.sale_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_return_id uuid NOT NULL REFERENCES public.sale_returns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_return_items ENABLE ROW LEVEL SECURITY;

-- Policies for items based on parent ownership
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sale_return_items' AND policyname = 'Admins can view any sale return items'
  ) THEN
    CREATE POLICY "Admins can view any sale return items"
    ON public.sale_return_items
    FOR SELECT
    USING (is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sale_return_items' AND policyname = 'Users can manage their sale return items'
  ) THEN
    CREATE POLICY "Users can manage their sale return items"
    ON public.sale_return_items
    FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.sale_returns sr
      WHERE sr.id = sale_return_items.sale_return_id
        AND sr.user_id = auth.uid()
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sale_return_items' AND policyname = 'Users can view their sale return items'
  ) THEN
    CREATE POLICY "Users can view their sale return items"
    ON public.sale_return_items
    FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.sale_returns sr
      WHERE sr.id = sale_return_items.sale_return_id
        AND sr.user_id = auth.uid()
    ));
  END IF;
END $$;