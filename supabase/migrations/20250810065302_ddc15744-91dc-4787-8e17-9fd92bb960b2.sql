-- Allow admins to view all attendance sessions
CREATE POLICY IF NOT EXISTS "Admins can view all sessions"
ON public.user_sessions
FOR SELECT
USING (is_admin(auth.uid()));