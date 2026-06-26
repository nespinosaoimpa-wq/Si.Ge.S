-- Whitelist System for Professional Access Control
-- Version: 2026.04.27
-- Description: Ensures only pre-approved emails can access the platform.

-- 1. Create Whitelist Table
CREATE TABLE IF NOT EXISTS public.authorized_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'operador', -- 'gerente', 'operador', 'cliente'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'revoked'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id)
);

-- 2. Index for fast lookup during login
CREATE INDEX IF NOT EXISTS idx_authorized_users_email ON public.authorized_users(email);

-- 3. RLS for authorized_users
ALTER TABLE public.authorized_users ENABLE ROW LEVEL SECURITY;

-- Managers can manage the whitelist
CREATE POLICY "Managers can manage whitelist" 
ON public.authorized_users 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role = 'gerente'
  )
);

-- Anyone can read their own authorization status (via email match)
-- Note: This is a bit tricky since they might not be logged in yet.
-- Usually, we check this via an Edge Function or a Trigger.

-- 4. Function to check authorization on sign-up
-- This can be used in a Supabase Auth Trigger if desired.
CREATE OR REPLACE FUNCTION public.check_user_authorization()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.authorized_users 
    WHERE email = NEW.email AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'User email % is not authorized for this platform. Contact your manager.', NEW.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger for new user registration (Supabase Auth)
-- Note: This requires 'auth' schema access, usually run as postgres.
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   BEFORE INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.check_user_authorization();

-- 6. Insert initial seed (Optional - The user/manager will do this via UI)
-- INSERT INTO public.authorized_users (email, role, status) VALUES ('admin@704-security.com', 'gerente', 'approved');
