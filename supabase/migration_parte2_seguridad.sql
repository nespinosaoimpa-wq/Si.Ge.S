-- ============================================================
-- SIGPAD — MIGRACIÓN PARTE 2/2: FUNCIONES Y SEGURIDAD RLS
-- ⚠️ Ejecutar SOLO DESPUÉS de que la PARTE 1 haya dado "Success"
-- ============================================================

-- ── Funciones de seguridad ────────────────────────────────────

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

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('gerente', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Función atómica de onboarding SaaS
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
  INSERT INTO public.tenants (name, slug, country_code, billing_status, plan_tier, admin_email)
  VALUES (p_tenant_name, p_tenant_slug, p_country_code, 'trial', p_plan_tier, p_admin_email)
  RETURNING id INTO v_tenant_id;

  UPDATE public.users
  SET tenant_id = v_tenant_id, role = 'gerente'
  WHERE id = p_admin_user_id;

  INSERT INTO public.authorized_users (email, role, status, tenant_id, notes)
  VALUES (p_admin_email, 'gerente', 'approved', v_tenant_id, 'Admin inicial — onboarding SaaS')
  ON CONFLICT (email) DO UPDATE
  SET role = 'gerente', status = 'approved', tenant_id = v_tenant_id;

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-inyecta tenant_id en inserts
CREATE OR REPLACE FUNCTION public.auto_set_tenant_id()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
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

-- ── Reemplazar políticas RLS abiertas por aislamiento tenant ──

-- tenants (solo propio o superadmin)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenants' AND policyname='tenant_self_access') THEN
    CREATE POLICY "tenant_self_access" ON public.tenants FOR ALL
      USING (id = public.get_current_tenant_id() OR public.is_superadmin())
      WITH CHECK (public.is_superadmin());
  END IF;
END $$;

-- objectives
DROP POLICY IF EXISTS "open_all_objectives" ON public.objectives;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objectives' AND policyname='tenant_isolation_objectives') THEN
    CREATE POLICY "tenant_isolation_objectives" ON public.objectives FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());
  END IF;
END $$;

-- resources
DROP POLICY IF EXISTS "open_all_resources" ON public.resources;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resources' AND policyname='tenant_isolation_resources') THEN
    CREATE POLICY "tenant_isolation_resources" ON public.resources FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());
  END IF;
END $$;

-- users
DROP POLICY IF EXISTS "open_all_users" ON public.users;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='tenant_isolation_users') THEN
    CREATE POLICY "tenant_isolation_users" ON public.users FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());
  END IF;
END $$;

-- guard_shifts
DROP POLICY IF EXISTS "open_all_gs" ON public.guard_shifts;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='guard_shifts' AND policyname='tenant_isolation_guard_shifts') THEN
    CREATE POLICY "tenant_isolation_guard_shifts" ON public.guard_shifts FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());
  END IF;
END $$;

-- guard_book_entries
DROP POLICY IF EXISTS "open_all_gbe" ON public.guard_book_entries;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='guard_book_entries' AND policyname='tenant_isolation_guard_book') THEN
    CREATE POLICY "tenant_isolation_guard_book" ON public.guard_book_entries FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());
  END IF;
END $$;

-- patrol_rounds
DROP POLICY IF EXISTS "open_all_pr" ON public.patrol_rounds;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patrol_rounds' AND policyname='tenant_isolation_patrol_rounds') THEN
    CREATE POLICY "tenant_isolation_patrol_rounds" ON public.patrol_rounds FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());
  END IF;
END $$;

-- alarms
DROP POLICY IF EXISTS "open_all_alarms" ON public.alarms;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='alarms' AND policyname='tenant_isolation_alarms') THEN
    CREATE POLICY "tenant_isolation_alarms" ON public.alarms FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());
  END IF;
END $$;

-- authorized_users
DROP POLICY IF EXISTS "open_all_au" ON public.authorized_users;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='authorized_users' AND policyname='tenant_isolation_authorized_users') THEN
    CREATE POLICY "tenant_isolation_authorized_users" ON public.authorized_users FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());
  END IF;
END $$;

-- checkpoints
DROP POLICY IF EXISTS "open_all_cp" ON public.checkpoints;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='checkpoints' AND policyname='tenant_isolation_checkpoints') THEN
    CREATE POLICY "tenant_isolation_checkpoints" ON public.checkpoints FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());
  END IF;
END $$;

-- gps_tracking
DROP POLICY IF EXISTS "open_all_gps" ON public.gps_tracking;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gps_tracking' AND policyname='tenant_isolation_gps') THEN
    CREATE POLICY "tenant_isolation_gps" ON public.gps_tracking FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());
  END IF;
END $$;

-- inventory_items
DROP POLICY IF EXISTS "open_all_inv" ON public.inventory_items;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inventory_items' AND policyname='tenant_isolation_inventory') THEN
    CREATE POLICY "tenant_isolation_inventory" ON public.inventory_items FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());
  END IF;
END $$;

-- inventory_handoffs
DROP POLICY IF EXISTS "open_all_inh" ON public.inventory_handoffs;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inventory_handoffs' AND policyname='tenant_isolation_handoffs') THEN
    CREATE POLICY "tenant_isolation_handoffs" ON public.inventory_handoffs FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());
  END IF;
END $$;

-- push_subscriptions
DROP POLICY IF EXISTS "open_all_ps" ON public.push_subscriptions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='push_subscriptions' AND policyname='tenant_isolation_push') THEN
    CREATE POLICY "tenant_isolation_push" ON public.push_subscriptions FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());
  END IF;
END $$;

-- patrol_track_points
DROP POLICY IF EXISTS "open_all_ptp" ON public.patrol_track_points;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patrol_track_points' AND policyname='tenant_isolation_patrol_tracks') THEN
    CREATE POLICY "tenant_isolation_patrol_tracks" ON public.patrol_track_points FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());
  END IF;
END $$;

-- geofence_alerts
DROP POLICY IF EXISTS "open_all_ga" ON public.geofence_alerts;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='geofence_alerts' AND policyname='tenant_isolation_geofence_alerts') THEN
    CREATE POLICY "tenant_isolation_geofence_alerts" ON public.geofence_alerts FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());
  END IF;
END $$;

-- patrol_trace
DROP POLICY IF EXISTS "open_all_ptrace" ON public.patrol_trace;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patrol_trace' AND policyname='tenant_isolation_patrol_trace') THEN
    CREATE POLICY "tenant_isolation_patrol_trace" ON public.patrol_trace FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());
  END IF;
END $$;

-- patrol_rounds_audit
DROP POLICY IF EXISTS "open_all_pra" ON public.patrol_rounds_audit;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patrol_rounds_audit' AND policyname='tenant_isolation_rounds_audit') THEN
    CREATE POLICY "tenant_isolation_rounds_audit" ON public.patrol_rounds_audit FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());
  END IF;
END $$;

-- contracts
DROP POLICY IF EXISTS "open_all_contracts" ON public.contracts;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contracts' AND policyname='tenant_isolation_contracts') THEN
    CREATE POLICY "tenant_isolation_contracts" ON public.contracts FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());
  END IF;
END $$;

-- objective_zones
DROP POLICY IF EXISTS "open_all_oz" ON public.objective_zones;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objective_zones' AND policyname='tenant_isolation_objective_zones') THEN
    CREATE POLICY "tenant_isolation_objective_zones" ON public.objective_zones FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin() OR tenant_id = public.get_current_tenant_id());
  END IF;
END $$;

-- profiles (propio o superadmin)
DROP POLICY IF EXISTS "open_all_profiles" ON public.profiles;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_own_or_superadmin') THEN
    CREATE POLICY "profiles_own_or_superadmin" ON public.profiles FOR ALL
      USING (id = auth.uid() OR public.is_superadmin())
      WITH CHECK (id = auth.uid() OR public.is_superadmin());
  END IF;
END $$;

-- billing_events (superadmin global, tenant puede leer el suyo)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='billing_events' AND policyname='billing_superadmin_only') THEN
    CREATE POLICY "billing_superadmin_only" ON public.billing_events FOR ALL
      USING (public.is_superadmin() OR tenant_id = public.get_current_tenant_id())
      WITH CHECK (public.is_superadmin());
  END IF;
END $$;

-- ── Vista global de métricas para Super Admin ─────────────────
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

-- ✅ MIGRACIÓN COMPLETA — SIGPAD SaaS Multi-Tenant activo
NOTIFY pgrst, 'reload schema';
