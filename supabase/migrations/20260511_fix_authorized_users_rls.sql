-- Fix RLS for authorized_users using security definer function
-- Version: 2026.05.11
-- Description: Updates the authorized_users policy to use public.is_manager() to avoid lookup failures.

-- 1. Drop the old policy
DROP POLICY IF EXISTS "Managers can manage whitelist" ON public.authorized_users;

-- 2. Create the new policy using the is_manager() function
-- Note: is_manager() was defined in 2026.04.29 migration as a SECURITY DEFINER function.
CREATE POLICY "Managers can manage whitelist v2" 
ON public.authorized_users 
FOR ALL 
USING (public.is_manager());

-- 3. Ensure anyone can see their own status if needed (optional but good practice)
-- CREATE POLICY "Users can see their own status" ON public.authorized_users FOR SELECT USING (email = auth.jwt() ->> 'email');
