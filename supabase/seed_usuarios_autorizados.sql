-- ═══════════════════════════════════════════════════════════════════
-- SIGPAD SaaS — Script de Carga Inicial de Usuarios Autorizados
-- Ejecutar en el SQL Editor del nuevo Supabase (São Paulo)
-- ═══════════════════════════════════════════════════════════════════

-- 1. SUPER ADMINISTRADOR (Usuario Madre — dueño de la plataforma)
INSERT INTO public.authorized_users (email, role, status, notes)
VALUES ('sigpad.info@gmail.com', 'superadmin', 'approved', 'Super Administrador Global — Propietario de la plataforma SIGPAD')
ON CONFLICT (email) DO UPDATE SET role = 'superadmin', status = 'approved';

-- 2. GERENTES AUTORIZADOS (Administradores locales de empresas)
INSERT INTO public.authorized_users (email, role, status, notes)
VALUES
  ('nespinosa.oimpa@gmail.com', 'gerente', 'approved', 'Gerente General — autorizado por administrador del sistema'),
  ('jugador.nico55@gmail.com', 'gerente', 'approved', 'Cuenta de desarrollo y pruebas'),
  ('admin@sigessecurity.com', 'gerente', 'approved', 'Cuenta administrativa principal SIGES'),
  ('segalf9@gmail.com', 'gerente', 'approved', 'Gerente — Habilitado para control administrativo')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, status = 'approved';

-- 3. VERIFICACIÓN: Confirmar que los usuarios fueron cargados
SELECT email, role, status, notes FROM public.authorized_users ORDER BY role, email;
