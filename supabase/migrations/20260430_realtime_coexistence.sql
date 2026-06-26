-- Migration: Realtime Coexistence and Schema Consolidation
-- Identifier: 20260430_realtime_coexistence

-- 1. Asegurar que guard_shifts existe con todos los campos (usada en checkin/checkout)
CREATE TABLE IF NOT EXISTS public.guard_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id TEXT NOT NULL,
    objective_id TEXT REFERENCES public.objectives(id),
    checkin_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checkout_time TIMESTAMPTZ,
    checkin_latitude DOUBLE PRECISION,
    checkin_longitude DOUBLE PRECISION,
    checkout_latitude DOUBLE PRECISION,
    checkout_longitude DOUBLE PRECISION,
    checkin_within_geofence BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'active',
    -- Campos para control de horas
    duration_minutes INTEGER,
    break_minutes INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de notificaciones push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- 3. Tabla de alarmas
CREATE TABLE IF NOT EXISTS public.alarms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    triggered_by TEXT, -- reference to resources(id) but loosely coupled as id is TEXT/UUID mix
    objective_id TEXT REFERENCES public.objectives(id),
    alarm_type TEXT NOT NULL,
    message TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status TEXT DEFAULT 'active',
    acknowledged_by TEXT,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Agregar campos a resources
ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS current_shift_id UUID,
ADD COLUMN IF NOT EXISTS current_objective_id TEXT;

-- 5. Habilitar Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='guard_shifts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guard_shifts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='alarms') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alarms;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='guard_book_entries') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guard_book_entries;
  END IF;
END $$;

-- 6. RLS Policies
ALTER TABLE public.guard_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alarms ENABLE ROW LEVEL SECURITY;

-- Temporary open policies for development to avoid RLS blockades before full auth sync
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'open_all' AND tablename = 'guard_shifts') THEN
        CREATE POLICY "open_all" ON public.guard_shifts FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'open_all' AND tablename = 'push_subscriptions') THEN
        CREATE POLICY "open_all" ON public.push_subscriptions FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'open_all' AND tablename = 'alarms') THEN
        CREATE POLICY "open_all" ON public.alarms FOR ALL USING (true);
    END IF;
END $$;

-- 7. View para planillas
CREATE OR REPLACE VIEW public.payroll_summary AS
SELECT 
  gs.operator_id,
  r.name as operator_name,
  o.name as objective_name,
  DATE(gs.checkin_time AT TIME ZONE 'America/Argentina/Buenos_Aires') as work_date,
  gs.checkin_time,
  gs.checkout_time,
  gs.duration_minutes,
  gs.overtime_minutes,
  gs.status
FROM public.guard_shifts gs
LEFT JOIN public.resources r ON r.id = gs.operator_id
LEFT JOIN public.objectives o ON o.id = gs.objective_id;
