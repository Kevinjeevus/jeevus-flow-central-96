-- First, let's check if the user exists in auth.users and create them if needed
-- We'll create a function to handle this securely

-- Create a function to promote a user to admin
CREATE OR REPLACE FUNCTION promote_user_to_admin(user_email TEXT)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to promote kaj@gmail.com to admin
SELECT promote_user_to_admin('kaj@gmail.com');