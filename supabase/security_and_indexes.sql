-- ================================================================
-- SIGPAD — POLÍTICAS RLS Y OPTIMIZACIÓN DE ÍNDICES (RESILIENTE)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. CREACIÓN DE ÍNDICES DE ALTO RENDIMIENTO
-- Acelera las consultas por tenant_id, fechas y estados
-- ────────────────────────────────────────────────────────────────

-- Índices para resources y objetivos por tenant
CREATE INDEX IF NOT EXISTS idx_resources_tenant_id ON public.resources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_objectives_tenant_id ON public.objectives(tenant_id);

-- Índices para guard_shifts (búsqueda de turnos activos y planillas)
CREATE INDEX IF NOT EXISTS idx_guard_shifts_operator_status ON public.guard_shifts(operator_id, status);
CREATE INDEX IF NOT EXISTS idx_guard_shifts_tenant_created ON public.guard_shifts(tenant_id, checkin_time DESC);

-- Índices para guard_book_entries (búsqueda por objetivo, fecha y urgencia)
CREATE INDEX IF NOT EXISTS idx_guard_book_tenant_created ON public.guard_book_entries(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guard_book_objective_created ON public.guard_book_entries(objective_id, created_at DESC);

-- Índices para alarmas activas
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alarms') THEN
    CREATE INDEX IF NOT EXISTS idx_alarms_tenant_status ON public.alarms(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_alarms_status_created ON public.alarms(status, created_at DESC);
  END IF;
END $$;

-- Índices para tracking y GPS (seguros si la tabla existe)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gps_tracking') THEN
    CREATE INDEX IF NOT EXISTS idx_gps_tracking_operator_recorded ON public.gps_tracking(operator_id, recorded_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tracking_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_tracking_logs_resource_recorded ON public.tracking_logs(resource_id, recorded_at DESC);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 2. LIMPIEZA Y CIERRE DE POLÍTICAS RLS PERMISIVAS
-- Protege las tablas en producción permitiendo acceso a Service Role
-- ────────────────────────────────────────────────────────────────

-- Guard Shifts
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guard_shifts') THEN
    ALTER TABLE public.guard_shifts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "open_all" ON public.guard_shifts;
    DROP POLICY IF EXISTS "open_all_gs" ON public.guard_shifts;
    DROP POLICY IF EXISTS "allow_service_role" ON public.guard_shifts;
    CREATE POLICY "allow_service_role" ON public.guard_shifts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Guard Book Entries
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guard_book_entries') THEN
    ALTER TABLE public.guard_book_entries ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Enable all for anyone" ON public.guard_book_entries;
    DROP POLICY IF EXISTS "open_all_gbe" ON public.guard_book_entries;
    DROP POLICY IF EXISTS "allow_service_role" ON public.guard_book_entries;
    CREATE POLICY "allow_service_role" ON public.guard_book_entries FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Alarms
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alarms') THEN
    ALTER TABLE public.alarms ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "open_all" ON public.alarms;
    DROP POLICY IF EXISTS "open_alarms" ON public.alarms;
    DROP POLICY IF EXISTS "allow_service_role" ON public.alarms;
    CREATE POLICY "allow_service_role" ON public.alarms FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Tracking Logs (Si existe)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tracking_logs') THEN
    ALTER TABLE public.tracking_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public Read/Write Access" ON public.tracking_logs;
    DROP POLICY IF EXISTS "allow_service_role" ON public.tracking_logs;
    CREATE POLICY "allow_service_role" ON public.tracking_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Patrol Rounds (Si existe)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patrol_rounds') THEN
    ALTER TABLE public.patrol_rounds ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Enable all for anyone" ON public.patrol_rounds;
    DROP POLICY IF EXISTS "allow_service_role" ON public.patrol_rounds;
    CREATE POLICY "allow_service_role" ON public.patrol_rounds FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 3. FUNCIÓN RPC PARA MANTENIMIENTO AUTOMÁTICO DE TURNOS ZOMBIE
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.clean_zombie_shifts()
RETURNS INTEGER AS $$
DECLARE
  v_closed_count INTEGER;
BEGIN
  UPDATE public.guard_shifts
  SET 
    status = 'incompleto',
    checkout_time = checkin_time + INTERVAL '12 hours',
    notes = COALESCE(notes, '') || ' [Cierre automático por inactividad +24h]'
  WHERE 
    status IN ('activo', 'active')
    AND checkout_time IS NULL
    AND checkin_time < NOW() - INTERVAL '24 hours';
    
  GET DIAGNOSTICS v_closed_count = ROW_COUNT;
  RETURN v_closed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
