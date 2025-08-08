-- Function to check if a user is admin based on profiles table
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.role = 'admin'
  );
$$;

-- Create policy for admins on sales_invoices (idempotent)
DO $$
BEGIN
  CREATE POLICY "Admins can view all sales invoices"
  ON public.sales_invoices
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create policy for admins on sales_invoice_items (idempotent)
DO $$
BEGIN
  CREATE POLICY "Admins can view any sales invoice items"
  ON public.sales_invoice_items
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;