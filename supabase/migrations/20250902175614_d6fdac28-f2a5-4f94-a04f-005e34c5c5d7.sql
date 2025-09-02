-- Update RLS policy to allow admins to delete any invoice
DROP POLICY IF EXISTS "Users can delete their own invoices" ON sales_invoices;

CREATE POLICY "Users can delete their own invoices or admins can delete any" 
ON sales_invoices 
FOR DELETE 
USING (
  auth.uid() = user_id OR 
  is_admin(auth.uid())
);