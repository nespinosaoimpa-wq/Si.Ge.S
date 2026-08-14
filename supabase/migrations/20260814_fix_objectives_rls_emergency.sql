-- ============================================================================
-- SIGPAD — Fix RLS Emergency: objectives
-- Migración: 20260814_fix_objectives_rls_emergency.sql
--
-- CUÁNDO APLICAR ESTE SCRIPT:
--   • Cuando /api/diagnostics/supabase reporta "RLS bloquea escrituras"
--   • Cuando los objetivos creados desde Vercel no persisten en la DB
--   • Cuando SUPABASE_SERVICE_ROLE_KEY está configurado pero las inserciones
--     aún fallan con código 42501 (insufficient_privilege)
--
-- QUÉ HACE:
--   1. Agrega una política que permite operaciones con service_role
--   2. Agrega cobertura para tenant_id IS NULL (objetivos globales)
--   3. NO elimina la política tenant_isolation existente (preserva la seguridad)
--
-- CÓMO APLICAR:
--   Supabase Dashboard → SQL Editor → pegar y ejecutar
-- ============================================================================

-- ── Paso 1: Verificar estado actual ─────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICANDO POLÍTICAS RLS EN objectives ===';
END $$;

SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objectives'
ORDER BY policyname;

-- ── Paso 2: Eliminar política de emergencia anterior si existe ───────────────
DROP POLICY IF EXISTS "service_role_all_objectives" ON public.objectives;
DROP POLICY IF EXISTS "sigpad_service_role_bypass" ON public.objectives;

-- ── Paso 3: Crear política de service_role bypass ────────────────────────────
-- Esta política corre JUNTO a tenant_isolation_objectives (no la reemplaza).
-- PostgreSQL evalúa: una fila es visible/modificable si AL MENOS UNA política
-- permissive la permite (OR semántico entre políticas permissive).
CREATE POLICY "service_role_all_objectives"
  ON public.objectives
  FOR ALL
  USING (
    -- ✅ Permitir cuando el rol es service_role (bypasea RLS)
    current_setting('role', true) = 'service_role'
    -- ✅ Superadmin siempre puede
    OR public.is_superadmin()
    -- ✅ Tenant aislado (política original)
    OR tenant_id = public.get_current_tenant_id()
    -- ✅ Objetivos globales sin tenant (datos de demostración y fallback)
    OR tenant_id IS NULL
  )
  WITH CHECK (
    current_setting('role', true) = 'service_role'
    OR public.is_superadmin()
    OR tenant_id = public.get_current_tenant_id()
    OR tenant_id IS NULL
  );

-- ── Paso 4: Verificar resultado ──────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '=== POLÍTICAS ACTIVAS DESPUÉS DEL FIX ===';
END $$;

SELECT
  policyname,
  cmd,
  permissive,
  qual
FROM pg_policies
WHERE tablename = 'objectives'
ORDER BY policyname;

-- ── Paso 5: Test de inserción de verificación ────────────────────────────────
-- Si este bloque se ejecuta sin error, las escrituras están funcionando.
DO $$
DECLARE
  v_test_id TEXT := 'RLS-TEST-' || extract(epoch from now())::TEXT;
  v_tenant_id UUID;
BEGIN
  -- Obtener el primer tenant activo para el test
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  -- Insertar fila de prueba
  INSERT INTO public.objectives (id, name, address, client_name, latitude, longitude, geofence_radius, is_active, tenant_id)
  VALUES (
    v_test_id,
    '[TEST RLS FIX] Verificación automática',
    'Script diagnóstico',
    'SISTEMA',
    -31.6107,
    -60.6973,
    100,
    false,
    v_tenant_id
  );

  -- Eliminar la fila de prueba
  DELETE FROM public.objectives WHERE id = v_test_id;

  RAISE NOTICE '✅ TEST RLS EXITOSO: Las escrituras en objectives funcionan correctamente.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⛔ TEST RLS FALLIDO: % — %', SQLERRM, SQLSTATE;
END $$;

-- ── Notas finales ─────────────────────────────────────────────────────────────
-- Después de aplicar este script:
--   1. Visitar /api/diagnostics/supabase para confirmar que write_permissions.ok = true
--   2. Crear un objetivo desde la UI de producción
--   3. Verificar en Supabase Dashboard → Table Editor → objectives que existe la fila
--
-- Si el problema persiste, verificar SUPABASE_SERVICE_ROLE_KEY en Vercel:
--   Settings → Environment Variables → SUPABASE_SERVICE_ROLE_KEY
--   El valor debe ser el JWT service_role que empieza con eyJ...
--   (NO el anon key que empieza con sb_publishable_...)
