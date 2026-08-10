-- ═══════════════════════════════════════════════════════════════════
-- SIGPAD SaaS — Script para promover Super Admin
-- Ejecutar en SQL Editor de Supabase DESPUÉS de que
-- sigpad.info@gmail.com se registre en /register
-- ═══════════════════════════════════════════════════════════════════

-- 1. Promover a superadmin (reemplazá el email si fuera necesario)
UPDATE public.users
SET role = 'superadmin'
WHERE email = 'sigpad.info@gmail.com';

-- 2. Verificar el resultado
SELECT id, email, role, tenant_id
FROM public.users
WHERE email = 'sigpad.info@gmail.com';

-- Resultado esperado:
--   role = 'superadmin'
--   tenant_id = NULL (el superadmin no pertenece a ningún tenant)
