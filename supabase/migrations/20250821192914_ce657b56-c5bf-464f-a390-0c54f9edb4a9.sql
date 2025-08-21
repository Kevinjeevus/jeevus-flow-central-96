-- Fix the products table policies conflict
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;

-- Recreate with proper names
CREATE POLICY "Auth users can view products" ON public.products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users can manage products" ON public.products FOR ALL USING (auth.role() = 'authenticated');