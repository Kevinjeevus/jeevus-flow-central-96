-- Create a policy to allow anonymous users to read employee data for login purposes
-- This is needed because the login flow requires looking up employee data before authentication
CREATE POLICY "Allow anonymous login lookup" 
ON public.employees 
FOR SELECT 
TO anon
USING (true);

-- Also ensure public role can read employees for login
CREATE POLICY "Allow public login lookup" 
ON public.employees 
FOR SELECT 
TO public
USING (true);