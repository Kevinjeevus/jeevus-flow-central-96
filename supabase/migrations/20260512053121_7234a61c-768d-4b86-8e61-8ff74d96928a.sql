
-- Add user_id ownership
ALTER TABLE public.transaction_prefixes
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- Backfill: assign existing rows to created_by where present
UPDATE public.transaction_prefixes
SET user_id = created_by
WHERE user_id IS NULL AND created_by IS NOT NULL;

-- Replace permissive RLS with per-user + superadmin
DROP POLICY IF EXISTS "Authenticated users can manage transaction prefixes" ON public.transaction_prefixes;
DROP POLICY IF EXISTS "Authenticated users can view transaction prefixes" ON public.transaction_prefixes;

CREATE POLICY "Users view own prefixes or superadmin views all"
ON public.transaction_prefixes FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_superadmin(auth.uid()));

CREATE POLICY "Users insert own prefixes or superadmin inserts any"
ON public.transaction_prefixes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_superadmin(auth.uid()));

CREATE POLICY "Users update own prefixes or superadmin updates any"
ON public.transaction_prefixes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.is_superadmin(auth.uid()));

CREATE POLICY "Users delete own prefixes or superadmin deletes any"
ON public.transaction_prefixes FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.is_superadmin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_transaction_prefixes_user_id ON public.transaction_prefixes(user_id);
