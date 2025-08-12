-- Harden functions: set search_path to avoid linter warnings

-- 1) update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2) promote_user_to_admin needs access to auth schema as well
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $function$
DECLARE
    target_user_id UUID;
BEGIN
    -- Find the user ID from auth.users
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RETURN 'User not found';
    END IF;
    
    -- Update or insert into profiles table
    INSERT INTO public.profiles (user_id, email, full_name, role)
    VALUES (target_user_id, user_email, 'Kevin Admin', 'admin')
    ON CONFLICT (user_id) 
    DO UPDATE SET role = 'admin';
    
    -- Update or insert into employees table if needed
    INSERT INTO public.employees (user_id, email, full_name, employee_id, sector, is_active)
    VALUES (target_user_id, user_email, 'Kevin Admin', 'EMP_ADMIN_001', 'admin', true)
    ON CONFLICT (user_id)
    DO UPDATE SET sector = 'admin', is_active = true;
    
    RETURN 'User promoted to admin successfully';
END;
$function$;

-- 3) update_account_balance
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update account current_balance
    UPDATE accounts 
    SET current_balance = current_balance + 
      CASE 
        WHEN NEW.transaction_type = 'credit' THEN NEW.amount 
        ELSE -NEW.amount 
      END,
      updated_at = now()
    WHERE id = NEW.account_id;
    
    -- Update balance_after in the transaction record
    UPDATE account_transactions 
    SET balance_after = (
      SELECT current_balance 
      FROM accounts 
      WHERE id = NEW.account_id
    )
    WHERE id = NEW.id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;