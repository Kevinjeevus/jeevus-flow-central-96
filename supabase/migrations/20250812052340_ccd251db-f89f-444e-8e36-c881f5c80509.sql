-- Payroll tables
-- 1) payroll_runs
CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  employee_count INTEGER NOT NULL DEFAULT 0,
  total_gross NUMERIC NOT NULL DEFAULT 0,
  total_deductions NUMERIC NOT NULL DEFAULT 0,
  total_net NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_user_period UNIQUE (user_id, period_year, period_month)
);

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

-- Policies for payroll_runs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payroll_runs' AND policyname='Users can view their payroll runs'
  ) THEN
    CREATE POLICY "Users can view their payroll runs"
    ON public.payroll_runs
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payroll_runs' AND policyname='Users can insert their payroll runs'
  ) THEN
    CREATE POLICY "Users can insert their payroll runs"
    ON public.payroll_runs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payroll_runs' AND policyname='Users can update their payroll runs'
  ) THEN
    CREATE POLICY "Users can update their payroll runs"
    ON public.payroll_runs
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payroll_runs' AND policyname='Users can delete their payroll runs'
  ) THEN
    CREATE POLICY "Users can delete their payroll runs"
    ON public.payroll_runs
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_payroll_runs_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_payroll_runs_updated_at
    BEFORE UPDATE ON public.payroll_runs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 2) payroll_items
CREATE TABLE IF NOT EXISTS public.payroll_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  basic NUMERIC NOT NULL DEFAULT 0,
  allowances NUMERIC NOT NULL DEFAULT 0,
  deductions NUMERIC NOT NULL DEFAULT 0,
  gross NUMERIC NOT NULL DEFAULT 0,
  net NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;

-- RLS referencing parent run ownership
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payroll_items' AND policyname='Users can view their payroll items'
  ) THEN
    CREATE POLICY "Users can view their payroll items"
    ON public.payroll_items
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.payroll_runs r
        WHERE r.id = payroll_run_id AND r.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payroll_items' AND policyname='Users can manage their payroll items'
  ) THEN
    CREATE POLICY "Users can manage their payroll items"
    ON public.payroll_items
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.payroll_runs r
        WHERE r.id = payroll_run_id AND r.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_payroll_runs_user_period ON public.payroll_runs(user_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payroll_items_run ON public.payroll_items(payroll_run_id);
