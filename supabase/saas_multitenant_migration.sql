-- ============================================================
-- SIGPAD — MIGRACIÓN SAAS MULTI-TENANT ENTERPRISE
-- Ejecutar en Supabase SQL Editor DESPUÉS de FRESH_START.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PASO 1: TABLA MAESTRA DE EMPRESAS (TENANTS)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-safe identifier e.g. "empresa-abc"
  country_code TEXT DEFAULT 'ar',
  timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#0f4c5c',
  -- Billing / SaaS plan
  billing_status TEXT DEFAULT 'trial'
    CHECK (billing_status IN ('trial','active','suspended','cancelled')),
  plan_tier TEXT DEFAULT 'starter'
    CHECK (plan_tier IN ('starter','professional','enterprise')),
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days'),
  billing_cycle_day INTEGER DEFAULT 1,  -- day of month invoices are generated
  -- Contact
  admin_email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,            -- CUIT in Argentina
  -- Metadata
  max_operators INTEGER DEFAULT 20,
  max_objectives INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on tenants (super-admin only can manage)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Tenants are only visible to their own members and superadmins
CREATE POLICY "tenant_self_access" ON public.tenants
  FOR ALL
  USING (
    id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'superadmin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'superadmin')
  );

-- ─────────────────────────────────────────────────────────────
-- PASO 2: AÑADIR COLUMNA tenant_id A TODAS LAS TABLAS
-- ─────────────────────────────────────────────────────────────

-- users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- objectives
ALTER TABLE public.objectives
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- resources
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- guard_shifts
ALTER TABLE public.guard_shifts
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- guard_book_entries
ALTER TABLE public.guard_book_entries
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- patrol_rounds
ALTER TABLE public.patrol_rounds
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- patrol_track_points
ALTER TABLE public.patrol_track_points
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- patrol_trace
ALTER TABLE public.patrol_trace
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- patrol_checkpoint_logs
ALTER TABLE public.patrol_checkpoint_logs
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- alarms
ALTER TABLE public.alarms
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- checkpoints
ALTER TABLE public.checkpoints
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- gps_tracking
ALTER TABLE public.gps_tracking
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- inventory_items
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- inventory_handoffs
ALTER TABLE public.inventory_handoffs
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- geofence_alerts
ALTER TABLE public.geofence_alerts
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- authorized_users
ALTER TABLE public.authorized_users
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- patrol_rounds_audit
ALTER TABLE public.patrol_rounds_audit
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- objective_zones
ALTER TABLE public.objective_zones
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- push_subscriptions
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- PASO 3: ÍNDICES DE RENDIMIENTO (Crítico para escala)
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_tenant ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_objectives_tenant ON public.objectives(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resources_tenant ON public.resources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guard_shifts_tenant ON public.guard_shifts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guard_book_tenant ON public.guard_book_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patrol_rounds_tenant ON public.patrol_rounds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patrol_trace_tenant ON public.patrol_trace(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_tenant ON public.gps_tracking(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alarms_tenant ON public.alarms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant ON public.inventory_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant ON public.contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_geofence_alerts_tenant ON public.geofence_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_authorized_users_tenant ON public.authorized_users(tenant_id);

-- ─────────────────────────────────────────────────────────────
-- PASO 4: FUNCIÓN CENTRAL DE AISLAMIENTO POR TENANT
-- ─────────────────────────────────────────────────────────────

-- Obtiene el tenant_id del usuario actualmente autenticado
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Verifica si el usuario actual es superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Verifica si el usuario actual es gerente de su tenant
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('gerente', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────────────────────
-- PASO 5: REEMPLAZAR POLÍTICAS ABIERTAS POR AISLAMIENTO TENANT
-- ─────────────────────────────────────────────────────────────

-- HELPER MACRO: superadmin bypass OR tenant match
-- (todas las políticas siguen este patrón)

-- objectives
DROP POLICY IF EXISTS "open_all_objectives" ON public.objectives;
CREATE POLICY "tenant_isolation_objectives" ON public.objectives
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- resources
DROP POLICY IF EXISTS "open_all_resources" ON public.resources;
CREATE POLICY "tenant_isolation_resources" ON public.resources
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- users
DROP POLICY IF EXISTS "open_all_users" ON public.users;
CREATE POLICY "tenant_isolation_users" ON public.users
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- guard_shifts
DROP POLICY IF EXISTS "open_all_gs" ON public.guard_shifts;
CREATE POLICY "tenant_isolation_guard_shifts" ON public.guard_shifts
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- guard_book_entries
DROP POLICY IF EXISTS "open_all_gbe" ON public.guard_book_entries;
CREATE POLICY "tenant_isolation_guard_book" ON public.guard_book_entries
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- patrol_rounds
DROP POLICY IF EXISTS "open_all_pr" ON public.patrol_rounds;
CREATE POLICY "tenant_isolation_patrol_rounds" ON public.patrol_rounds
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- alarms
DROP POLICY IF EXISTS "open_all_alarms" ON public.alarms;
CREATE POLICY "tenant_isolation_alarms" ON public.alarms
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- authorized_users
DROP POLICY IF EXISTS "open_all_au" ON public.authorized_users;
CREATE POLICY "tenant_isolation_authorized_users" ON public.authorized_users
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- checkpoints
DROP POLICY IF EXISTS "open_all_cp" ON public.checkpoints;
CREATE POLICY "tenant_isolation_checkpoints" ON public.checkpoints
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- patrol_checkpoint_logs
DROP POLICY IF EXISTS "open_all_pcl" ON public.patrol_checkpoint_logs;
CREATE POLICY "tenant_isolation_checkpoint_logs" ON public.patrol_checkpoint_logs
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- gps_tracking
DROP POLICY IF EXISTS "open_all_gps" ON public.gps_tracking;
CREATE POLICY "tenant_isolation_gps" ON public.gps_tracking
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- inventory_items
DROP POLICY IF EXISTS "open_all_inv" ON public.inventory_items;
CREATE POLICY "tenant_isolation_inventory" ON public.inventory_items
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- inventory_handoffs
DROP POLICY IF EXISTS "open_all_inh" ON public.inventory_handoffs;
CREATE POLICY "tenant_isolation_handoffs" ON public.inventory_handoffs
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- push_subscriptions
DROP POLICY IF EXISTS "open_all_ps" ON public.push_subscriptions;
CREATE POLICY "tenant_isolation_push" ON public.push_subscriptions
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- patrol_track_points
DROP POLICY IF EXISTS "open_all_ptp" ON public.patrol_track_points;
CREATE POLICY "tenant_isolation_patrol_tracks" ON public.patrol_track_points
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- geofence_alerts
DROP POLICY IF EXISTS "open_all_ga" ON public.geofence_alerts;
CREATE POLICY "tenant_isolation_geofence_alerts" ON public.geofence_alerts
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- patrol_trace
DROP POLICY IF EXISTS "open_all_ptrace" ON public.patrol_trace;
CREATE POLICY "tenant_isolation_patrol_trace" ON public.patrol_trace
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- patrol_rounds_audit
DROP POLICY IF EXISTS "open_all_pra" ON public.patrol_rounds_audit;
CREATE POLICY "tenant_isolation_rounds_audit" ON public.patrol_rounds_audit
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- contracts
DROP POLICY IF EXISTS "open_all_contracts" ON public.contracts;
CREATE POLICY "tenant_isolation_contracts" ON public.contracts
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- objective_zones
DROP POLICY IF EXISTS "open_all_oz" ON public.objective_zones;
CREATE POLICY "tenant_isolation_objective_zones" ON public.objective_zones
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());

-- profiles (propio perfil o superadmin)
DROP POLICY IF EXISTS "open_all_profiles" ON public.profiles;
CREATE POLICY "profiles_own_or_superadmin" ON public.profiles
  FOR ALL
  USING (id = auth.uid() OR public.is_superadmin())
  WITH CHECK (id = auth.uid() OR public.is_superadmin());

-- ─────────────────────────────────────────────────────────────
-- PASO 6: FUNCIÓN ATÓMICA DE ONBOARDING (crea tenant + admin)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_tenant_with_admin(
  p_tenant_name TEXT,
  p_tenant_slug TEXT,
  p_admin_email TEXT,
  p_admin_user_id UUID,
  p_country_code TEXT DEFAULT 'ar',
  p_plan_tier TEXT DEFAULT 'trial'
)
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- 1. Crear el tenant
  INSERT INTO public.tenants (name, slug, country_code, billing_status, plan_tier, admin_email)
  VALUES (p_tenant_name, p_tenant_slug, p_country_code, 'trial', p_plan_tier, p_admin_email)
  RETURNING id INTO v_tenant_id;

  -- 2. Vincular al usuario admin con el tenant recién creado
  UPDATE public.users
  SET tenant_id = v_tenant_id, role = 'gerente'
  WHERE id = p_admin_user_id;

  -- 3. También whitelist en authorized_users
  INSERT INTO public.authorized_users (email, role, status, tenant_id, notes)
  VALUES (p_admin_email, 'gerente', 'approved', v_tenant_id, 'Administrador inicial — creado en onboarding SaaS')
  ON CONFLICT (email) DO UPDATE
  SET role = 'gerente', status = 'approved', tenant_id = v_tenant_id;

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- PASO 7: TRIGGER — AUTO-PROPAGACIÓN DE tenant_id EN INSERTS
-- ─────────────────────────────────────────────────────────────

-- Función genérica para inyectar tenant_id automáticamente
CREATE OR REPLACE FUNCTION public.auto_set_tenant_id()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Solo inyectar si no viene ya seteado
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM public.users
    WHERE id = auth.uid()
    LIMIT 1;
    NEW.tenant_id := v_tenant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger a las tablas principales
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'objectives','resources','guard_shifts','guard_book_entries',
    'patrol_rounds','alarms','checkpoints','gps_tracking',
    'inventory_items','patrol_trace','geofence_alerts',
    'contracts','authorized_users'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_auto_tenant_%1$s ON public.%1$s;
       CREATE TRIGGER trg_auto_tenant_%1$s
       BEFORE INSERT ON public.%1$s
       FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();',
      t
    );
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- PASO 8: VISTA GLOBAL PARA SUPER ADMIN (métricas por tenant)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.saas_tenant_metrics AS
SELECT
  t.id AS tenant_id,
  t.name AS tenant_name,
  t.billing_status,
  t.plan_tier,
  t.country_code,
  t.created_at,
  COUNT(DISTINCT u.id) AS total_users,
  COUNT(DISTINCT r.id) AS total_operators,
  COUNT(DISTINCT o.id) AS total_objectives,
  COUNT(DISTINCT gs.id) FILTER (WHERE gs.status = 'activo') AS active_shifts,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'active') AS open_alarms
FROM public.tenants t
LEFT JOIN public.users u ON u.tenant_id = t.id
LEFT JOIN public.resources r ON r.tenant_id = t.id
LEFT JOIN public.objectives o ON o.tenant_id = t.id
LEFT JOIN public.guard_shifts gs ON gs.tenant_id = t.id
LEFT JOIN public.alarms a ON a.tenant_id = t.id
GROUP BY t.id, t.name, t.billing_status, t.plan_tier, t.country_code, t.created_at;

-- ─────────────────────────────────────────────────────────────
-- PASO 9: TABLA DE FACTURACIÓN / HISTORIAL DE MEMBRESÍAS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'subscription_started','payment_received','payment_failed',
    'plan_upgraded','plan_downgraded','trial_started','trial_expired',
    'account_suspended','account_reactivated'
  )),
  amount NUMERIC(12,2),
  currency TEXT DEFAULT 'ARS',
  period_start DATE,
  period_end DATE,
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_superadmin_only" ON public.billing_events
  FOR ALL
  USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
  WITH CHECK (public.is_superadmin());

CREATE INDEX IF NOT EXISTS idx_billing_tenant ON public.billing_events(tenant_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- PASO 10: NOTIFICAR POSTGREST
-- ─────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- ✅ MIGRACIÓN SAAS MULTI-TENANT COMPLETADA
-- Tablas nuevas: tenants, billing_events
-- Columna tenant_id añadida a: 20 tablas existentes
-- RLS actualizado: 20 políticas de aislamiento por empresa
-- Funciones: get_current_tenant_id, is_superadmin, is_manager,
--            create_tenant_with_admin, auto_set_tenant_id
-- Vista: saas_tenant_metrics
-- ============================================================
