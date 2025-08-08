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

-- Allow admins to view all sales invoices
CREATE POLICY IF NOT EXISTS "Admins can view all sales invoices"
ON public.sales_invoices
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow admins to view any sales invoice items (needed for nested selects)
CREATE POLICY IF NOT EXISTS "Admins can view any sales invoice items"
ON public.sales_invoice_items
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));