-- Fix Infinite Recursion in users Policy
-- Version: 2026.04.29
-- Description: Introduces a security definer function to check manager role without triggering RLS recursion.

-- 1. Create the security definer function
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'gerente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the problematic policy
DROP POLICY IF EXISTS "gerentes_full_access" ON public.users;

-- 3. Create the fixed policy for managers
CREATE POLICY "gerentes_full_access" ON public.users
    FOR ALL USING (public.is_manager());

-- 4. Create policy for users to read their own record (essential for auth/profile)
CREATE POLICY "users_read_own" ON public.users
    FOR SELECT USING (id = auth.uid());
