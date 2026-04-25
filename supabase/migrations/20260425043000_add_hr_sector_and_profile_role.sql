-- Add 'hr' to the employee_sector enum
ALTER TYPE public.employee_sector ADD VALUE IF NOT EXISTS 'hr';

-- Update the profiles role CHECK constraint to include 'hr' and 'sales'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'employee', 'manager', 'salesman', 'accountant', 'marketing', 'manufacturing', 'hr', 'sales'));
