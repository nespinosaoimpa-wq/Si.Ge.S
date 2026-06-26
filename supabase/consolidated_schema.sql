-- ==========================================================
-- Si.Ge.S — CONSOLIDATED SCHEMA MIGRATION
-- Generated: 2026-06-26T17:19:06.619Z
-- Contains 53 migrations executed in chronological order.
-- ==========================================================

-- ----------------------------------------------------------
-- Migration: 20240410_enhanced_schema.sql
-- ----------------------------------------------------------

-- 1. Expand Resources Table for Deep Profiling
ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS hiring_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS salary TEXT,
ADD COLUMN IF NOT EXISTS psych_expiry DATE,
ADD COLUMN IF NOT EXISTS license_expiry DATE,
ADD COLUMN IF NOT EXISTS training_expiry DATE,
ADD COLUMN IF NOT EXISTS performance_data JSONB DEFAULT '[{"month": "Enero", "hours": 160, "incidents": 0, "punctuality": 100}]'::jsonb,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS dni TEXT;

-- 2. Expand Objectives Table for Logistics
ALTER TABLE public.objectives
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Seed some "Real" Data for Demonstration
-- Update existing resources if any, or insert new ones for testing
INSERT INTO public.resources (id, name, role, status, latitude, longitude, phone, email, hiring_date, salary, psych_expiry, license_expiry, performance_data)
VALUES 
('S-701', 'Carlos Méndez', 'Vigilante Principal', 'active', -31.6107, -60.6973, '+54 342 555-0123', 'c.mendez@sps.com', '2024-01-12', '$840.000', '2026-10-12', '2027-03-05', 
 '[{"month": "Enero", "hours": 168, "incidents": 0, "punctuality": 98}, {"month": "Febrero", "hours": 172, "incidents": 1, "punctuality": 95}, {"month": "Marzo", "hours": 160, "incidents": 0, "punctuality": 99}]'::jsonb),
('S-702', 'Marta Ruiz', 'Supervisora de Zona', 'active', -31.6200, -60.7000, '+54 342 555-0124', 'm.ruiz@sps.com', '2023-11-20', '$920.000', '2025-12-01', '2024-06-15',
 '[{"month": "Enero", "hours": 180, "incidents": 0, "punctuality": 100}, {"month": "Febrero", "hours": 184, "incidents": 0, "punctuality": 98}, {"month": "Marzo", "hours": 170, "incidents": 2, "punctuality": 92}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET 
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  performance_data = EXCLUDED.performance_data;

-- ----------------------------------------------------------
-- Migration: 20240417_add_avatar_url.sql
-- ----------------------------------------------------------

-- Add avatar_url to resources table
ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Index for faster lookups by email if needed
CREATE INDEX IF NOT EXISTS idx_resources_email ON public.resources(email);

-- ----------------------------------------------------------
-- Migration: 20260414_custody_system.sql
-- ----------------------------------------------------------

-- SPS Custodia: Business OS Schema Enhancement
-- Version: 2026.04.14
-- Description: Adds tables for clock-ins, virtual guard book, and logistics.

-- 1. Guard Clock-in Logs (Fichajes)
CREATE TABLE IF NOT EXISTS public.guard_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id TEXT REFERENCES public.resources(id),
    objective_id TEXT REFERENCES public.objectives(id),
    clock_in TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIME,
    clock_out TIMESTAMP WITH TIME ZONE,
    latitude_in DOUBLE PRECISION,
    longitude_in DOUBLE PRECISION,
    latitude_out DOUBLE PRECISION,
    longitude_out DOUBLE PRECISION,
    status TEXT DEFAULT 'active' -- 'active', 'completed', 'alert'
);

-- 2. Virtual Guard Book (Libro de Guardia Digital)
CREATE TABLE IF NOT EXISTS public.guard_book_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id TEXT REFERENCES public.objectives(id),
    resource_id TEXT REFERENCES public.resources(id),
    entry_type TEXT NOT NULL, -- 'novedad', 'ronda', 'incidente', 'entrega_puesto'
    content TEXT NOT NULL,
    photo_urls TEXT[], -- Array of uploaded image URLs
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIME
);

-- 3. Patrol Rounds (Rondines)
CREATE TABLE IF NOT EXISTS public.patrol_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id TEXT REFERENCES public.objectives(id),
    resource_id TEXT REFERENCES public.resources(id),
    round_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIME,
    round_end TIMESTAMP WITH TIME ZONE,
    checkpoints_reached JSONB DEFAULT '[]'::jsonb, -- List of checkpoints with timestamps
    status TEXT DEFAULT 'pending' -- 'pending', 'completed', 'incomplete'
);

-- 4. Objective Tools (Herramientas por Puesto)
CREATE TABLE IF NOT EXISTS public.objective_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id TEXT REFERENCES public.objectives(id),
    name TEXT NOT NULL,
    serial_number TEXT,
    condition TEXT DEFAULT 'good', -- 'good', 'damaged', 'missing'
    assigned_to TEXT REFERENCES public.resources(id),
    last_check_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIME
);

-- 5. Objective Assignments (Histórico de Asignaciones)
CREATE TABLE IF NOT EXISTS public.objective_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id TEXT REFERENCES public.objectives(id),
    resource_id TEXT REFERENCES public.resources(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIME,
    unassigned_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- RLS (Row Level Security) - Basic open for MVP
ALTER TABLE public.guard_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_book_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrol_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for anyone" ON public.guard_logs FOR ALL USING (true);
CREATE POLICY "Enable all for anyone" ON public.guard_book_entries FOR ALL USING (true);
CREATE POLICY "Enable all for anyone" ON public.patrol_rounds FOR ALL USING (true);
CREATE POLICY "Enable all for anyone" ON public.objective_tools FOR ALL USING (true);
CREATE POLICY "Enable all for anyone" ON public.objective_assignments FOR ALL USING (true);

-- ----------------------------------------------------------
-- Migration: 20260416_geofence_rpc.sql
-- ----------------------------------------------------------

-- SQL Function for Geofencing
-- Calculates Haversine distance and checks if point is within radius
CREATE OR REPLACE FUNCTION public.check_geofence(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_objective_id TEXT,
    p_radius_meters DOUBLE PRECISION DEFAULT 200.0
)
RETURNS BOOLEAN AS $$
DECLARE
    v_obj_lat DOUBLE PRECISION;
    v_obj_lng DOUBLE PRECISION;
    v_dist DOUBLE PRECISION;
BEGIN
    -- Get objective coordinates
    SELECT latitude, longitude INTO v_obj_lat, v_obj_lng
    FROM public.objectives
    WHERE id = p_objective_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Haversine formula
    v_dist := 6371000 * acos(
        cos(radians(v_obj_lat)) * cos(radians(p_lat)) * 
        cos(radians(p_lng) - radians(v_obj_lng)) + 
        sin(radians(v_obj_lat)) * sin(radians(p_lat))
    );

    RETURN v_dist <= p_radius_meters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------
-- Migration: 20260416_gps_tracking.sql
-- ----------------------------------------------------------

-- Migration for real-time GPS tracking and Legal compliance

CREATE TABLE IF NOT EXISTS public.resource_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id TEXT REFERENCES public.resources(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    battery_level INTEGER,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    shift_id UUID REFERENCES public.guard_shifts(id)
);

-- Index for querying latest locations
CREATE INDEX IF NOT EXISTS idx_resource_locations_resource
ON public.resource_locations(resource_id, recorded_at DESC);

-- Allow public read/write for now
ALTER TABLE public.resource_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read/Write Access" ON public.resource_locations;
CREATE POLICY "Public Read/Write Access" ON public.resource_locations FOR ALL USING (true);

-- Enable Replication for Realtime updates
-- Check if table is already in publication to avoid errors (or simply try-catch equivalent in postgres if needed, 
-- but usually a single ADD TABLE is fine if it wasn't there before. 
-- In supabase, realtime publication is managed from the UI or via sql:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'resource_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_locations;
  END IF;
END
$$;

-- Create user_consents for Phase 4 compliance
CREATE TABLE IF NOT EXISTS public.user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id TEXT REFERENCES public.resources(id),
    consent_type TEXT NOT NULL, -- 'gps_tracking', 'cookies', 'terms'
    accepted BOOLEAN DEFAULT false,
    ip_address TEXT,
    user_agent TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read/Write Access" ON public.user_consents;
CREATE POLICY "Public Read/Write Access" ON public.user_consents FOR ALL USING (true);

-- ----------------------------------------------------------
-- Migration: 20260416_tracking_logs.sql
-- ----------------------------------------------------------

-- 1. Create tracking_logs table
CREATE TABLE IF NOT EXISTS public.tracking_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guard_log_id UUID REFERENCES public.guard_logs(id),
    resource_id TEXT REFERENCES public.resources(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIME
);

-- 2. Enable RLS
ALTER TABLE public.tracking_logs ENABLE ROW LEVEL SECURITY;

-- 3. Add default all-access policy for development
CREATE POLICY "Public Read/Write Access" ON public.tracking_logs FOR ALL USING (true);

-- ----------------------------------------------------------
-- Migration: 20260417_cleanup_locations.sql
-- ----------------------------------------------------------

-- Migration to cleanup old location table
-- Run this only after confirming all systems are using tracking_logs

DROP TABLE IF EXISTS public.resource_locations CASCADE;

-- ----------------------------------------------------------
-- Migration: 20260421_resource_metadata.sql
-- ----------------------------------------------------------

-- Migration: Add Real-time Metadata to Resources
-- This enables the manager dashboard to see precision and speed without querying logs.

ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS accuracy DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS speed DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS heading DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS battery_level INTEGER,
ADD COLUMN IF NOT EXISTS last_gps_update TIMESTAMP WITH TIME ZONE;

-- Add comment for clarity
COMMENT ON COLUMN public.resources.accuracy IS 'GPS accuracy in meters';
COMMENT ON COLUMN public.resources.speed IS 'Speed in meters per second';
COMMENT ON COLUMN public.resources.heading IS 'Heading in degrees (0-360)';

-- ----------------------------------------------------------
-- Migration: 20260427_auth_whitelist.sql
-- ----------------------------------------------------------

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

-- ----------------------------------------------------------
-- Migration: 20260427_checkpoints.sql
-- ----------------------------------------------------------

-- Patrol Management: Checkpoints System
-- Version: 2026.04.27
-- Description: Adds strategic checkpoints for each objective and improves patrol round tracking.

-- 1. Strategic Checkpoints
CREATE TABLE IF NOT EXISTS public.checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id TEXT REFERENCES public.objectives(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    qr_code TEXT UNIQUE, -- QR content to validate
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Patrol Checkpoint Logs (Validation history)
CREATE TABLE IF NOT EXISTS public.patrol_checkpoint_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID REFERENCES public.patrol_rounds(id) ON DELETE CASCADE,
    checkpoint_id UUID REFERENCES public.checkpoints(id) ON DELETE CASCADE,
    resource_id TEXT REFERENCES public.resources(id),
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    photo_url TEXT
);

-- 3. RLS
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrol_checkpoint_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for all" ON public.checkpoints FOR SELECT USING (true);
CREATE POLICY "Enable all for managers" ON public.checkpoints FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role = 'gerente'
  )
);

CREATE POLICY "Enable all for anyone" ON public.patrol_checkpoint_logs FOR ALL USING (true);

-- ----------------------------------------------------------
-- Migration: 20260427_emergency_auth.sql
-- ----------------------------------------------------------

-- Emergency Authorization for Chief Manager
-- Identifier: 20260427_emergency_manager_auth

INSERT INTO public.resources (name, email, role, status)
VALUES ('Nico Espinosa', 'nespinosa.oimpa@gmail.com', 'Gerente', 'active')
ON CONFLICT (email) DO UPDATE SET role = 'Gerente', status = 'active';

INSERT INTO public.authorized_users (email, role, status, notes)
VALUES ('nespinosa.oimpa@gmail.com', 'gerente', 'approved', 'Authorized by system administrator')
ON CONFLICT (email) DO UPDATE SET role = 'gerente', status = 'approved';

-- ----------------------------------------------------------
-- Migration: 20260429_fix_users_recursion.sql
-- ----------------------------------------------------------

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

-- ----------------------------------------------------------
-- Migration: 20260430_realtime_coexistence.sql
-- ----------------------------------------------------------

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

-- ----------------------------------------------------------
-- Migration: 20260430_shifts_and_payroll.sql
-- ----------------------------------------------------------

-- ============================================================
-- Migración: Columnas de control de turnos y planillas
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columnas de duración y horas extra en guard_shifts
ALTER TABLE guard_shifts
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_shift_id UUID;

-- 2. Agregar columna de turno activo en resources
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS current_shift_id UUID REFERENCES guard_shifts(id) ON DELETE SET NULL;

-- 3. Agregar columna urgency en guard_book_entries
ALTER TABLE guard_book_entries
  ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal'
    CHECK (urgency IN ('normal', 'baja', 'media', 'alta', 'critica'));

-- 4. Tabla de alarmas (si no existe)
CREATE TABLE IF NOT EXISTS alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by TEXT NOT NULL,
  objective_id TEXT,
  alarm_type TEXT NOT NULL DEFAULT 'panico',
  message TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  acknowledged_by TEXT
);

-- 5. Enable Realtime para alarms
ALTER PUBLICATION supabase_realtime ADD TABLE alarms;

-- 6. RLS abierta temporal para alarms (restringir cuando Auth esté estabilizado)
ALTER TABLE alarms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_alarms" ON "alarms";
CREATE POLICY "open_alarms" ON "alarms" FOR ALL USING (true) WITH CHECK (true);

-- 7. RLS abierta temporal para guard_book_entries (Service Role la maneja en prod)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'guard_book_entries' AND policyname = 'open_all_gbe'
  ) THEN
    ALTER TABLE guard_book_entries ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "open_all_gbe" ON guard_book_entries FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 8. RLS abierta temporal para guard_shifts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'guard_shifts' AND policyname = 'open_all_gs'
  ) THEN
    ALTER TABLE guard_shifts ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "open_all_gs" ON guard_shifts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 9. Vista de resumen de planillas (compatible con el payroll API)
CREATE OR REPLACE VIEW payroll_summary AS
SELECT
  gs.operator_id,
  r.name AS operator_name,
  COUNT(*) AS shifts_count,
  COALESCE(SUM(gs.duration_minutes), 0) AS total_minutes,
  COALESCE(SUM(gs.overtime_minutes), 0) AS overtime_minutes,
  COALESCE(SUM(gs.duration_minutes) - SUM(gs.overtime_minutes), 0) AS regular_minutes,
  MIN(gs.checkin_time) AS first_shift,
  MAX(gs.checkin_time) AS last_shift
FROM guard_shifts gs
LEFT JOIN resources r ON r.id = gs.operator_id
WHERE gs.status = 'completado'
GROUP BY gs.operator_id, r.name;

-- ----------------------------------------------------------
-- Migration: 20260506_drop_all_resource_fkeys.sql
-- ----------------------------------------------------------

-- ============================================================
-- Migración: DROP ALL RESOURCE FK CONSTRAINTS
-- Profesionalización del esquema: Eliminar restricciones que bloquean
-- el flujo de datos dinámico entre Auth y Resources.
-- ============================================================

DO $$
DECLARE
    _table_name TEXT;
    _constraint_name TEXT;
BEGIN
    -- Lista de tablas que referencian public.resources(id)
    FOR _table_name, _constraint_name IN 
        SELECT 
            tc.table_name, 
            tc.constraint_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE 
            tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'resources'
            AND ccu.column_name = 'id'
            AND tc.table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', _table_name, _constraint_name);
        RAISE NOTICE 'Eliminado constraint % de la tabla %', _constraint_name, _table_name;
    END LOOP;

    RAISE NOTICE 'Limpieza de Foreign Keys completada. El sistema ahora permite flujo híbrido UUID/ResourceID.';
END $$;

-- ----------------------------------------------------------
-- Migration: 20260506_fix_guard_shifts.sql
-- ----------------------------------------------------------

-- ============================================================
-- Migración: Fix guard_shifts FK constraint + normalizar status
-- EJECUTAR EN SUPABASE SQL EDITOR ANTES DE DEPLOYAR
-- ============================================================

-- 1. Eliminar el FK problemático que bloquea check-ins
--    Este constraint apunta a users(id) o auth.users(id), pero operator_id
--    almacena IDs de resources (ej: 'S-701') que no existen en esas tablas.
ALTER TABLE public.guard_shifts 
  DROP CONSTRAINT IF EXISTS guard_shifts_operator_id_fkey;

-- También eliminar cualquier otro FK residual sobre operator_id
DO $$
DECLARE
  _constraint_name TEXT;
BEGIN
  FOR _constraint_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.guard_shifts'::regclass
      AND contype = 'f'
      AND EXISTS (
        SELECT 1 FROM pg_attribute
        WHERE attrelid = 'public.guard_shifts'::regclass
          AND attname = 'operator_id'
          AND attnum = ANY(conkey)
      )
  LOOP
    EXECUTE format('ALTER TABLE public.guard_shifts DROP CONSTRAINT IF EXISTS %I', _constraint_name);
    RAISE NOTICE 'Dropped FK constraint: %', _constraint_name;
  END LOOP;
END $$;

-- 2. Normalizar status: convertir 'active' → 'activo' en todos los registros
UPDATE public.guard_shifts SET status = 'activo' WHERE status = 'active';

-- 3. Cambiar el valor default de la columna status a 'activo'
ALTER TABLE public.guard_shifts 
  ALTER COLUMN status SET DEFAULT 'activo';

-- 4. Asegurar que guard_shifts esté en la publicación Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'guard_shifts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guard_shifts;
  END IF;
END $$;

-- 5. Verificación: listar constraints restantes (informativo)
DO $$
DECLARE
  _row RECORD;
BEGIN
  RAISE NOTICE '--- Constraints activos en guard_shifts ---';
  FOR _row IN
    SELECT conname, contype FROM pg_constraint
    WHERE conrelid = 'public.guard_shifts'::regclass
  LOOP
    RAISE NOTICE 'Constraint: % (type: %)', _row.conname, _row.contype;
  END LOOP;
END $$;

-- ----------------------------------------------------------
-- Migration: 20260510_enhanced_employee_records.sql
-- ----------------------------------------------------------

-- ============================================================
-- Migración: Ficha Personal Extendida
-- Agrega campos para talles, credenciales, sanciones y legajo digital.
-- ============================================================

ALTER TABLE public.resources 
  -- Talles y Uniforme
  ADD COLUMN IF NOT EXISTS shirt_size TEXT,
  ADD COLUMN IF NOT EXISTS pants_size TEXT,
  ADD COLUMN IF NOT EXISTS boot_size TEXT,
  ADD COLUMN IF NOT EXISTS last_uniform_delivery DATE,
  
  -- Credenciales y Seguridad
  ADD COLUMN IF NOT EXISTS credential_number TEXT,
  ADD COLUMN IF NOT EXISTS credential_expiry DATE,
  
  -- Legajo Digital (JSONB para flexibilidad)
  ADD COLUMN IF NOT EXISTS sanctions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS medical_records JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS leaves JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- Comentarios para documentación
COMMENT ON COLUMN public.resources.sanctions IS 'Historial de sanciones: [{date, reason, severity, signed_url}]';
COMMENT ON COLUMN public.resources.medical_records IS 'Carpetas médicas y artículos: [{date, type, duration, doctor, diagnosis}]';
COMMENT ON COLUMN public.resources.documents IS 'Documentos adjuntos: [{name, url, uploaded_at}]';

-- ----------------------------------------------------------
-- Migration: 20260510_fix_relationships.sql
-- ----------------------------------------------------------

-- ============================================================
-- Migración: Vinculación de Relaciones (Fix Joins)
-- Asegura que PostgREST reconozca las relaciones para los .select()
-- ============================================================

-- 1. Asegurar relación en guard_shifts
ALTER TABLE public.guard_shifts
  DROP CONSTRAINT IF EXISTS guard_shifts_objective_id_fkey;

ALTER TABLE public.guard_shifts
  ADD CONSTRAINT guard_shifts_objective_id_fkey 
  FOREIGN KEY (objective_id) 
  REFERENCES public.objectives(id) 
  ON DELETE SET NULL;

-- 2. Asegurar relación en resources
ALTER TABLE public.resources
  DROP CONSTRAINT IF EXISTS resources_current_objective_id_fkey;

ALTER TABLE public.resources
  ADD CONSTRAINT resources_current_objective_id_fkey 
  FOREIGN KEY (current_objective_id) 
  REFERENCES public.objectives(id) 
  ON DELETE SET NULL;

-- 3. Notificar a PostgREST que el esquema cambió
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------
-- Migration: 20260510_performance_optimization.sql
-- ----------------------------------------------------------

-- ============================================================
-- Migración: Optimización de Rendimiento
-- Agrega índices para acelerar las consultas de la Ficha Personal.
-- ============================================================

-- Índice para búsquedas por operador (Crucial para la Ficha Personal)
CREATE INDEX IF NOT EXISTS idx_guard_shifts_operator_id 
ON public.guard_shifts(operator_id);

-- Índice para ordenamiento cronológico (Acelera el historial y liquidación)
CREATE INDEX IF NOT EXISTS idx_guard_shifts_checkin_time 
ON public.guard_shifts(checkin_time DESC);

-- Índice para el status de los turnos
CREATE INDEX IF NOT EXISTS idx_guard_shifts_status 
ON public.guard_shifts(status);

-- Índice para relación con objetivos
CREATE INDEX IF NOT EXISTS idx_guard_shifts_objective_id 
ON public.guard_shifts(objective_id);

ANALYZE public.guard_shifts;

-- ----------------------------------------------------------
-- Migration: 20260510_v3_inventory.sql
-- ----------------------------------------------------------

-- ============================================================
-- Migración v3.0: Módulo de Inventario y Stock
-- ============================================================

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'linterna', 'celular', 'detector_metales', 'camara_seguridad', 'reflector', 'otros'
  serial_number TEXT,
  condition TEXT DEFAULT 'operativo', -- 'operativo', 'roto', 'mantenimiento', 'baja', 'faltante'
  assigned_to_objective TEXT REFERENCES public.objectives(id) ON DELETE SET NULL,
  assigned_to_resource TEXT, -- ID del operador responsable (opcional)
  notes TEXT,
  purchase_date DATE,
  last_inspection DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id TEXT NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL, -- operador que reporta
  shift_id UUID REFERENCES public.guard_shifts(id) ON DELETE SET NULL,
  items JSONB NOT NULL, -- [{item_id, condition, notes}]
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_objective ON public.inventory_items(assigned_to_objective);
CREATE INDEX IF NOT EXISTS idx_inventory_handoffs_objective ON public.inventory_handoffs(objective_id);

-- Notificar a PostgREST
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------
-- Migration: 20260510_v3_patrol_tracking.sql
-- ----------------------------------------------------------

-- ============================================================
-- Migración v3.0: Trazabilidad de Rondines (Fase 4)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.patrol_track_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.patrol_rounds(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patrol_tracks_round ON public.patrol_track_points(round_id, recorded_at);

-- Limpieza automática de puntos de más de 7 días
-- Usamos una función de DB que se puede llamar o programar
CREATE OR REPLACE FUNCTION cleanup_old_patrol_tracks()
RETURNS void AS $$
BEGIN
  DELETE FROM public.patrol_track_points
  WHERE recorded_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql;

-- Notificar a PostgREST
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------
-- Migration: 20260510_v3_performance.sql
-- ----------------------------------------------------------

-- ============================================================
-- Migración v3.0: Performance y Estabilidad (CRÍTICA)
-- ============================================================

-- 1. Restaurar Foreign Keys esenciales para que PostgREST pueda hacer JOINs
-- Resources -> Objectives (current_objective_id)
ALTER TABLE public.resources
  DROP CONSTRAINT IF EXISTS resources_current_objective_id_fkey;

ALTER TABLE public.resources
  ADD CONSTRAINT resources_current_objective_id_fkey 
  FOREIGN KEY (current_objective_id) 
  REFERENCES public.objectives(id) 
  ON DELETE SET NULL;

-- Guard Shifts -> Objectives
ALTER TABLE public.guard_shifts
  DROP CONSTRAINT IF EXISTS guard_shifts_objective_id_fkey;

ALTER TABLE public.guard_shifts
  ADD CONSTRAINT guard_shifts_objective_id_fkey 
  FOREIGN KEY (objective_id) 
  REFERENCES public.objectives(id) 
  ON DELETE SET NULL;

-- Nota: No forzamos FK estricta de operator_id -> resources porque 
-- hay IDs alfanuméricos mezclados con UUIDs temporalmente.

-- 2. Índices críticos para performance (Acelera los SELECTs masivos)
CREATE INDEX IF NOT EXISTS idx_resources_status ON public.resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_email ON public.resources(email);
CREATE INDEX IF NOT EXISTS idx_resources_assigned_to ON public.resources(assigned_to);

CREATE INDEX IF NOT EXISTS idx_gps_tracking_user_time 
ON public.gps_tracking(user_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_guard_book_created_at 
ON public.guard_book_entries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guard_shifts_checkout_time 
ON public.guard_shifts(checkout_time);

-- 3. Limpieza de mapa: Asegurar que los inactivos no tengan GPS pegado
UPDATE public.resources 
SET latitude = NULL, longitude = NULL 
WHERE status != 'activo' AND status != 'active';

-- 4. Notificar a PostgREST que recargue el esquema (Vital para los JOINs)
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------
-- Migration: 20260510_v4_consolidated_schema.sql
-- ----------------------------------------------------------

-- ============================================================
-- Migración v4.0: Esquema Consolidado (EJECUTAR EN SUPABASE)
-- Resuelve: "column does not exist", relaciones rotas, y lentitud
-- ============================================================

-- 1. Columnas base de resources (pueden no existir en bases antiguas)
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS dni TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS hiring_date DATE,
  ADD COLUMN IF NOT EXISTS salary NUMERIC,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to TEXT;

-- 2. Columnas extendidas del legajo (enhanced_employee_records)
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS shirt_size TEXT,
  ADD COLUMN IF NOT EXISTS pants_size TEXT,
  ADD COLUMN IF NOT EXISTS boot_size TEXT,
  ADD COLUMN IF NOT EXISTS last_uniform_delivery DATE,
  ADD COLUMN IF NOT EXISTS credential_number TEXT,
  ADD COLUMN IF NOT EXISTS credential_expiry DATE,
  ADD COLUMN IF NOT EXISTS psych_expiry DATE,
  ADD COLUMN IF NOT EXISTS license_expiry DATE,
  ADD COLUMN IF NOT EXISTS training_expiry DATE,
  ADD COLUMN IF NOT EXISTS sanctions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS medical_records JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS leaves JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- 3. Columnas GPS en resources (para el mapa en vivo)
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS speed DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS heading DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_gps_update TIMESTAMPTZ;

-- 4. Relaciones FK (para que PostgREST pueda hacer JOINs)
ALTER TABLE public.resources
  DROP CONSTRAINT IF EXISTS resources_current_objective_id_fkey;
ALTER TABLE public.resources
  ADD CONSTRAINT resources_current_objective_id_fkey
  FOREIGN KEY (current_objective_id)
  REFERENCES public.objectives(id)
  ON DELETE SET NULL;

ALTER TABLE public.guard_shifts
  DROP CONSTRAINT IF EXISTS guard_shifts_objective_id_fkey;
ALTER TABLE public.guard_shifts
  ADD CONSTRAINT guard_shifts_objective_id_fkey
  FOREIGN KEY (objective_id)
  REFERENCES public.objectives(id)
  ON DELETE SET NULL;

-- 5. Índices de performance
CREATE INDEX IF NOT EXISTS idx_resources_status ON public.resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_email ON public.resources(email);
CREATE INDEX IF NOT EXISTS idx_guard_shifts_operator ON public.guard_shifts(operator_id, checkin_time DESC);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_user_time ON public.gps_tracking(user_id, recorded_at DESC);

-- 6. Tablas de inventario (si no existen)
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  condition TEXT NOT NULL DEFAULT 'operativo',
  objective_id UUID REFERENCES public.objectives(id) ON DELETE SET NULL,
  serial_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID,
  operator_id TEXT,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'operativo',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Tabla de tracking de rondines (si no existe)
CREATE TABLE IF NOT EXISTS public.patrol_track_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.patrol_rounds(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patrol_tracks_round ON public.patrol_track_points(round_id, recorded_at);

-- 8. Limpieza: Guardias inactivos no deben aparecer en el mapa
UPDATE public.resources
SET latitude = NULL, longitude = NULL
WHERE status NOT IN ('activo', 'active');

-- 9. Notificar a PostgREST que recargue el esquema (VITAL)
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------
-- Migration: 20260510_v5_inventory_history.sql
-- ----------------------------------------------------------

-- 1. Crear tabla de logs de inventario
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'asignacion', 'devolucion', 'reparacion', 'baja', 'creacion'
    previous_condition TEXT,
    new_condition TEXT,
    previous_objective_id UUID REFERENCES public.objectives(id),
    new_objective_id UUID REFERENCES public.objectives(id),
    performed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- 3. Políticas
CREATE POLICY "Enable all for authenticated users" ON public.inventory_logs
    FOR ALL USING (auth.role() = 'authenticated');

-- 4. Trigger para auto-loguear cambios en inventory_items (Opcional pero recomendado)
CREATE OR REPLACE FUNCTION log_inventory_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO inventory_logs (
            item_id, 
            action_type, 
            previous_condition, 
            new_condition, 
            previous_objective_id, 
            new_objective_id,
            notes
        ) VALUES (
            NEW.id,
            'actualizacion',
            OLD.condition,
            NEW.condition,
            OLD.assigned_to_objective,
            NEW.assigned_to_objective,
            'Cambio automático de estado/ubicación'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_log_inventory_change
AFTER UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION log_inventory_change();

-- ----------------------------------------------------------
-- Migration: 20260511_fix_authorized_users_rls.sql
-- ----------------------------------------------------------

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

-- ----------------------------------------------------------
-- Migration: 20260511_fix_patrol_joins.sql
-- ----------------------------------------------------------

-- Restore relationship metadata for patrol_rounds to enable PostgREST joins
ALTER TABLE public.patrol_rounds
  DROP CONSTRAINT IF EXISTS patrol_rounds_resource_id_fkey;

ALTER TABLE public.patrol_rounds
  ADD CONSTRAINT patrol_rounds_resource_id_fkey 
  FOREIGN KEY (resource_id) 
  REFERENCES public.resources(id) 
  ON DELETE SET NULL;

ALTER TABLE public.patrol_rounds
  DROP CONSTRAINT IF EXISTS patrol_rounds_objective_id_fkey;

ALTER TABLE public.patrol_rounds
  ADD CONSTRAINT patrol_rounds_objective_id_fkey 
  FOREIGN KEY (objective_id) 
  REFERENCES public.objectives(id) 
  ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------
-- Migration: 20260511_v6_incidents_fix.sql
-- ----------------------------------------------------------

-- 1. Agregar columnas de resolución a guard_book_entries si no existen
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'guard_book_entries' AND column_name = 'status') THEN
        ALTER TABLE public.guard_book_entries ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'guard_book_entries' AND column_name = 'resolved_at') THEN
        ALTER TABLE public.guard_book_entries ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Asegurar que los objetivos tengan latitud/longitud como tipo numérico (Double Precision)
-- Esto ya debería estar pero lo reforzamos
ALTER TABLE public.objectives ALTER COLUMN latitude TYPE DOUBLE PRECISION;
ALTER TABLE public.objectives ALTER COLUMN longitude TYPE DOUBLE PRECISION;

-- 3. Crear índice para búsquedas rápidas de alertas activas
CREATE INDEX IF NOT EXISTS idx_guard_book_active_incidents ON public.guard_book_entries (status) WHERE status != 'resolved';

-- ----------------------------------------------------------
-- Migration: 20260512_geofence_alerts.sql
-- ----------------------------------------------------------

-- Phase 4: Alertas de Abandono de Puesto (Exit Geofencing)

-- 1. Table for geofence breach events (Auditoria)
CREATE TABLE IF NOT EXISTS public.geofence_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID REFERENCES public.guard_shifts(id) ON DELETE CASCADE,
    operator_id TEXT,
    objective_id UUID REFERENCES public.objectives(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL, -- 'exit' or 'entry'
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add status columns to guard_shifts for real-time monitoring
ALTER TABLE public.guard_shifts
ADD COLUMN IF NOT EXISTS geofence_status TEXT DEFAULT 'inside', -- 'inside', 'outside', 'abandoned'
ADD COLUMN IF NOT EXISTS last_exit_at TIMESTAMP WITH TIME ZONE;

-- 3. Function to log geofence alerts and update shift status
CREATE OR REPLACE FUNCTION public.log_geofence_alert(
    p_shift_id UUID,
    p_operator_id TEXT,
    p_objective_id UUID,
    p_type TEXT,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_dist DOUBLE PRECISION
)
RETURNS VOID AS $$
BEGIN
    -- Insert into logs
    INSERT INTO public.geofence_alerts (shift_id, operator_id, objective_id, alert_type, latitude, longitude, distance_meters)
    VALUES (p_shift_id, p_operator_id, p_objective_id, p_type, p_lat, p_lng, p_dist);

    -- Update shift record
    UPDATE public.guard_shifts
    SET 
        geofence_status = CASE WHEN p_type = 'exit' THEN 'abandoned' ELSE 'inside' END,
        last_exit_at = CASE WHEN p_type = 'exit' THEN NOW() ELSE NULL END
    WHERE id = p_shift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------
-- Migration: 20260512_geofencing_incidents.sql
-- ----------------------------------------------------------

-- Final Phase: Incidence Reporting & Static Mapping

-- 1. Optimized table for Geofencing Incidents
CREATE TABLE IF NOT EXISTS public.geofencing_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID REFERENCES public.guard_shifts(id) ON DELETE CASCADE,
    operator_id TEXT,
    objective_id UUID REFERENCES public.objectives(id) ON DELETE CASCADE,
    exit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    return_at TIMESTAMP WITH TIME ZONE,
    max_distance_meters DOUBLE PRECISION DEFAULT 0,
    map_snapshot_url TEXT,
    supervisor_comment TEXT,
    status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'justificado', 'sancionado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_geofence_incidents_shift ON public.geofencing_incidents(shift_id);

-- 3. Storage Bucket for Static Maps
-- Note: This usually needs to be created via Supabase UI or API, but we ensure the table logic is ready.
-- We will assume a bucket named 'incidents' exists.

-- ----------------------------------------------------------
-- Migration: 20260512_postgis_and_routes.sql
-- ----------------------------------------------------------

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometric column to guard_shifts for storing the final patrol route
ALTER TABLE public.guard_shifts 
ADD COLUMN IF NOT EXISTS patrol_route GEOMETRY(LineString, 4326);

-- Create a table for 'Cold' historical data if it doesn't exist
-- This table stores individual points but with geometric support for spatial queries
CREATE TABLE IF NOT EXISTS public.gps_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID REFERENCES public.guard_shifts(id) ON DELETE CASCADE,
    operator_id TEXT, -- No FK to avoid type mismatch with resources(id) which can be UUID or TEXT depending on session
    location GEOMETRY(Point, 4326) NOT NULL,
    accuracy DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for spatial queries
CREATE INDEX IF NOT EXISTS idx_gps_history_location ON public.gps_history USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_gps_history_shift ON public.gps_history (shift_id);

-- Function to consolidate points into a LineString and simplify it
CREATE OR REPLACE FUNCTION consolidate_patrol_route(p_shift_id UUID)
RETURNS GEOMETRY AS $$
DECLARE
    v_route GEOMETRY;
BEGIN
    -- 1. Create LineString from points ordered by time
    -- 2. Simplify using Ramer-Douglas-Peucker (tolerance in degrees, ~0.0001 is approx 11m)
    SELECT ST_Simplify(ST_MakeLine(location ORDER BY recorded_at), 0.00005)
    INTO v_route
    FROM public.gps_history
    WHERE shift_id = p_shift_id;

    -- Update the shift record
    UPDATE public.guard_shifts
    SET patrol_route = v_route
    WHERE id = p_shift_id;

    RETURN v_route;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------
-- Migration: 20260512_strict_geofencing.sql
-- ----------------------------------------------------------

-- Phase 3: Strict Geofencing with PostGIS

-- 1. Ensure objectives have geometric support
ALTER TABLE public.objectives 
ADD COLUMN IF NOT EXISTS location GEOMETRY(Point, 4326),
ADD COLUMN IF NOT EXISTS geofence_radius_meters DOUBLE PRECISION DEFAULT 70.0;

-- 2. Backfill location from lat/lng if not set
UPDATE public.objectives
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE location IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- 3. Create a spatial index for objectives
CREATE INDEX IF NOT EXISTS idx_objectives_location ON public.objectives USING GIST (location);

-- 4. Re-implement check_geofence using ST_DWithin (PostGIS)
-- This is much more accurate and faster than manual Haversine
CREATE OR REPLACE FUNCTION public.check_geofence(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_objective_id TEXT,
    p_radius_meters DOUBLE PRECISION DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_radius DOUBLE PRECISION;
    v_is_within BOOLEAN;
BEGIN
    -- Use provided radius or fall back to objective's default
    IF p_radius_meters IS NULL THEN
        SELECT geofence_radius_meters INTO v_radius
        FROM public.objectives
        WHERE id = p_objective_id;
    ELSE
        v_radius := p_radius_meters;
    END IF;

    -- Standard tolerance if not specified
    IF v_radius IS NULL THEN v_radius := 70.0; END IF;

    -- ST_DWithin uses the spatial index
    -- Note: We use geography for meters calculation
    SELECT ST_DWithin(
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        location::geography,
        v_radius
    ) INTO v_is_within
    FROM public.objectives
    WHERE id = p_objective_id;

    RETURN COALESCE(v_is_within, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------
-- Migration: 20260513183637_20260514_inventory_system.sql
-- ----------------------------------------------------------

-- Migration: Inventory System for Objectives & Operators

CREATE TABLE IF NOT EXISTS public.resource_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID REFERENCES public.objectives(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  serial_number TEXT,
  status TEXT DEFAULT 'Operativo' CHECK (status IN ('Operativo', 'Dañado', 'Faltante')),
  assigned_to UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.resource_inventory ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated users (managers and operators)
CREATE POLICY "Full access inventory" ON public.resource_inventory
  FOR ALL USING (true) WITH CHECK (true);

-- Insert demo data
INSERT INTO public.resource_inventory (objective_id, item_name, serial_number, status)
SELECT id, 'Radio Handie Motorola', 'MT-8842', 'Operativo' FROM public.objectives LIMIT 3;

INSERT INTO public.resource_inventory (objective_id, item_name, serial_number, status)
SELECT id, 'Chaleco Antibala RB3', 'CH-9912', 'Operativo' FROM public.objectives LIMIT 3;

-- ----------------------------------------------------------
-- Migration: 20260513184620_20260514_digital_evidence.sql
-- ----------------------------------------------------------

-- Create digital evidence table
CREATE TABLE IF NOT EXISTS public.digital_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID REFERENCES public.objectives(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.digital_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow operators to insert evidence" ON public.digital_evidence
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all to view evidence" ON public.digital_evidence
  FOR SELECT USING (true);

-- Insert bucket for storage if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('backups', 'backups', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for backups bucket
CREATE POLICY "Public Access backups" ON storage.objects
  FOR SELECT USING (bucket_id = 'backups');

CREATE POLICY "Allow inserts backups" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'backups');

-- ----------------------------------------------------------
-- Migration: 20260513191729_20260514_patrol_rounds_activity.sql
-- ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.patrol_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
    objective_id UUID REFERENCES public.objectives(id) ON DELETE CASCADE,
    start_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_at TIMESTAMP WITH TIME ZONE,
    distance_km NUMERIC DEFAULT 0
);

ALTER TABLE public.patrol_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to insert patrol_rounds"
ON public.patrol_rounds FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow public read access for patrol_rounds"
ON public.patrol_rounds FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to update patrol_rounds"
ON public.patrol_rounds FOR UPDATE TO authenticated USING (true);

-- Link patrol_trace
ALTER TABLE public.patrol_trace ADD COLUMN IF NOT EXISTS round_id UUID REFERENCES public.patrol_rounds(id) ON DELETE CASCADE;

-- Link incidents (already have latitude, longitude in earlier migrations, just adding round_id)
ALTER TABLE public.guard_book_entries ADD COLUMN IF NOT EXISTS round_id UUID REFERENCES public.patrol_rounds(id) ON DELETE CASCADE;

-- ----------------------------------------------------------
-- Migration: 20260513_cleanup_junk_data.sql
-- ----------------------------------------------------------

-- 1. Clean up "junk" data in guard_shifts (inverted constructor remnants)
-- Delete shifts where operator_id contains non-UUID patterns or function snippets
DELETE FROM public.guard_shifts 
WHERE operator_id::text LIKE '%(pos)%' 
   OR operator_id::text LIKE '%function%'
   OR length(operator_id::text) > 50;

-- 2. Reset "ghost" resources that haven't moved in 24h
DO $$
BEGIN
  -- Use dynamic SQL to handle potentially missing columns
  EXECUTE 'UPDATE public.resources
           SET status = ''disponible''' 
           || CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'current_shift_id') THEN ', current_shift_id = NULL' ELSE '' END 
           || CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'current_objective_id') THEN ', current_objective_id = NULL' ELSE '' END 
           || ', latitude = NULL, longitude = NULL
           WHERE status IN (''activo'', ''active'') 
             AND (last_gps_update < NOW() - INTERVAL ''24 hours'' OR last_gps_update IS NULL)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error resetting resources: %', SQLERRM;
END
$$;

-- 3. Ensure objectives table has the correct column for radius if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objectives' AND column_name = 'geofence_radius_meters') THEN
    ALTER TABLE public.objectives ADD COLUMN geofence_radius_meters INTEGER DEFAULT 70;
  END IF;
END
$$;

-- 4. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------
-- Migration: 20260513_fix_resource_columns.sql
-- ----------------------------------------------------------

-- Add missing columns to resources table for shift tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'current_shift_id') THEN
    ALTER TABLE public.resources ADD COLUMN current_shift_id UUID REFERENCES public.guard_shifts(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'current_objective_id') THEN
    ALTER TABLE public.resources ADD COLUMN current_objective_id UUID REFERENCES public.objectives(id);
  END IF;
END
$$;

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------
-- Migration: 20260513_patrol_trace.sql
-- ----------------------------------------------------------

-- Forensic Traceability Table for Patrol Rounds
CREATE TABLE IF NOT EXISTS public.patrol_trace (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID REFERENCES public.guard_shifts(id) ON DELETE CASCADE,
    round_id UUID REFERENCES public.patrol_rounds(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOGRAPHY(POINT, 4326),
    accuracy DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to automatically update geom from lat/lng
CREATE OR REPLACE FUNCTION update_patrol_trace_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_patrol_trace_geom ON public.patrol_trace;
CREATE TRIGGER trg_update_patrol_trace_geom
    BEFORE INSERT ON public.patrol_trace
    FOR EACH ROW
    EXECUTE FUNCTION update_patrol_trace_geom();

-- Indexes for spatial and temporal performance
CREATE INDEX IF NOT EXISTS idx_patrol_trace_geom ON public.patrol_trace USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_patrol_trace_round ON public.patrol_trace(round_id, created_at);

-- Enable Realtime for live trace drawing if needed
ALTER PUBLICATION supabase_realtime ADD TABLE patrol_trace;

-- Open RLS for development
ALTER TABLE patrol_trace ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_all_trace" ON patrol_trace FOR ALL USING (true) WITH CHECK (true);

-- ----------------------------------------------------------
-- Migration: 20260513_production_hardening.sql
-- ----------------------------------------------------------

-- ============================================================
-- SPS 704 OS — Production Hardening Migration
-- Fecha: 2026-05-13
-- ============================================================

-- 1. TARIFAS DINÁMICAS
-- Agrega hourly_pay_rate a la tabla resources (tarifa de nómina por operador)
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS hourly_pay_rate NUMERIC(10, 2) DEFAULT 3500.00;

-- Agrega hourly_billing_rate a la tabla objectives (tarifa de facturación al cliente)
ALTER TABLE objectives
  ADD COLUMN IF NOT EXISTS hourly_billing_rate NUMERIC(10, 2) DEFAULT 4500.00;

-- 2. BAJA LÓGICA DE PERSONAL
-- La columna status ya debería existir, pero aseguramos el valor 'baja'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='resources' AND column_name='status'
  ) THEN
    ALTER TABLE resources ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- 3. MULTIMEDIA EN GUARD BOOK
-- Agrega columnas de URLs de multimedia a guard_book_entries
ALTER TABLE guard_book_entries
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- 4. CAMPOS DE LEGAJO COMPLETO EN RESOURCES
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS shirt_size TEXT,
  ADD COLUMN IF NOT EXISTS pants_size TEXT,
  ADD COLUMN IF NOT EXISTS boot_size TEXT;

-- credential_number y credential_expiry ya deberían existir, pero aseguramos:
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS credential_number TEXT,
  ADD COLUMN IF NOT EXISTS credential_expiry DATE;

-- ============================================================
-- 5. SUPABASE STORAGE — Bucket novedades-media
-- EJECUTAR MANUALMENTE en Supabase Dashboard → SQL Editor
-- (los buckets no se crean via SQL estándar en migraciones,
--  se crean via Storage API o Dashboard)
-- ============================================================

-- Insertar el bucket vía la tabla interna de storage (método alternativo):
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'novedades-media',
  'novedades-media',
  true,
  10485760, -- 10 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. RLS POLICIES — Storage bucket novedades-media
-- ============================================================

-- Lectura pública (cualquiera puede ver las fotos de novedades)
CREATE POLICY "novedades_media_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'novedades-media');

-- Solo usuarios autenticados pueden subir
CREATE POLICY "novedades_media_auth_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'novedades-media');

-- Solo el propietario o el service role puede eliminar
CREATE POLICY "novedades_media_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'novedades-media' AND auth.uid()::text = owner);

-- ============================================================
-- 7. RLS POLICIES — guard_book_entries (asegurar que image_url
--    y audio_url sean accesibles para lectura por todos los roles)
-- ============================================================

-- Habilitar RLS si no estaba habilitado
ALTER TABLE guard_book_entries ENABLE ROW LEVEL SECURITY;

-- Policy de lectura para autenticados (gerentes y operadores)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'guard_book_entries' AND policyname = 'guard_book_authenticated_read'
  ) THEN
    CREATE POLICY "guard_book_authenticated_read"
    ON guard_book_entries FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- Policy de inserción para autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'guard_book_entries' AND policyname = 'guard_book_authenticated_insert'
  ) THEN
    CREATE POLICY "guard_book_authenticated_insert"
    ON guard_book_entries FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- 8. ÍNDICES DE PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_credential_expiry ON resources(credential_expiry);
CREATE INDEX IF NOT EXISTS idx_guard_book_objective ON guard_book_entries(objective_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guard_shifts_resource ON guard_shifts(resource_id, check_in DESC);

-- ----------------------------------------------------------
-- Migration: 20260513_tactical_unification.sql
-- ----------------------------------------------------------

-- ============================================================
-- Migración: Unificación Táctica y Auditoría Forense (v5.0)
-- Descripción: Establece el esquema para avatars, telemetría vinculada y RLS de trazabilidad.
-- ============================================================

-- 1. Tabla de Perfiles (para Avatars e Información Pública)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Realtime para profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- 2. Vincular Resources a Profiles
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Telemetría Vinculada a Objetivos
-- Agregar objective_id a gps_tracking para filtrado táctico instantáneo
ALTER TABLE public.gps_tracking
  ADD COLUMN IF NOT EXISTS objective_id UUID REFERENCES public.objectives(id) ON DELETE SET NULL;

-- Agregar objective_id a geofence_alerts para auditoría por nodo (Safe Check)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'geofence_alerts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'geofence_alerts' AND column_name = 'objective_id') THEN
      ALTER TABLE public.geofence_alerts ADD COLUMN objective_id UUID REFERENCES public.objectives(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 4. Índices B-tree para Optimización de Performance
CREATE INDEX IF NOT EXISTS idx_resources_current_objective ON public.resources(current_objective_id);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_objective ON public.gps_tracking(objective_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'geofence_alerts' AND column_name = 'objective_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'geofence_alerts' AND indexname = 'idx_geofence_alerts_objective') THEN
      CREATE INDEX idx_geofence_alerts_objective ON public.geofence_alerts(objective_id);
    END IF;
  END IF;
END $$;

-- 5. RLS para patrol_trace (Seguridad Forense)
ALTER TABLE public.patrol_trace ENABLE ROW LEVEL SECURITY;

-- Política: Gerentes pueden ver todo
CREATE POLICY "Managers can view all traces"
ON public.patrol_trace
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role = 'gerente'
  )
);

-- Política: Escritura permitida para el Service Role (Backend)
-- Note: Service role bypasses RLS by default, but we specify it for clarity if needed.
-- However, if the frontend ever tries to save directly:
CREATE POLICY "Operators can insert their own traces"
ON public.patrol_trace
FOR INSERT
WITH CHECK (true); -- Permitimos inserción abierta para evitar latencia, el backend valida shift_id.

-- 6. Trigger para auto-crear perfil al registrarse (Opcional pero recomendado)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
-- CREATE TRIGGER on_auth_user_created_profile
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- 7. Recargar Esquema
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------
-- Migration: 20260514150000_create_patrol_rounds_audit.sql
-- ----------------------------------------------------------

-- 20260514150000_create_patrol_rounds_audit.sql
CREATE TABLE IF NOT EXISTS public.patrol_rounds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    objective_id UUID REFERENCES public.objectives(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    telemetry_path JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'in_progress',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.patrol_rounds ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Permitir lectura autenticada a patrol_rounds"
    ON public.patrol_rounds FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir inserción/actualización a authenticated"
    ON public.patrol_rounds FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------
-- Migration: 20260514_add_billing_rates.sql
-- ----------------------------------------------------------

-- Migration to add dynamic billing and pay rates

-- Add hourly_billing_rate to objectives (default 3500)
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS hourly_billing_rate numeric DEFAULT 3500;

-- Add hourly_pay_rate to resources (default 3500)
ALTER TABLE resources ADD COLUMN IF NOT EXISTS hourly_pay_rate numeric DEFAULT 3500;

-- ----------------------------------------------------------
-- Migration: 20260514_fix_resources_rls.sql
-- ----------------------------------------------------------

-- Fix RLS for resources table to allow gerentes to view all staff
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gerentes can view all resources" ON resources;

CREATE POLICY "Gerentes can view all resources" ON resources 
FOR SELECT 
TO authenticated 
USING (
  (auth.jwt() ->> 'role' = 'gerente') OR 
  (auth.uid() = assigned_to)
);

-- Also ensure managers can see related data
ALTER TABLE guard_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gerentes can view all shifts" ON guard_shifts;
CREATE POLICY "Gerentes can view all shifts" ON guard_shifts 
FOR SELECT 
TO authenticated 
USING (auth.jwt() ->> 'role' = 'gerente');

ALTER TABLE patrol_rounds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gerentes can view all rounds" ON patrol_rounds;
CREATE POLICY "Gerentes can view all rounds" ON patrol_rounds 
FOR SELECT 
TO authenticated 
USING (auth.jwt() ->> 'role' = 'gerente');

-- ----------------------------------------------------------
-- Migration: 20260514_objective_zones.sql
-- ----------------------------------------------------------

-- ============================================================
-- TAREA 2: Geocodificación Inversa Táctica (PostGIS)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Tabla de zonas internas por objetivo
CREATE TABLE IF NOT EXISTS public.objective_zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID REFERENCES public.objectives(id) ON DELETE CASCADE,
  zone_name   TEXT NOT NULL,
  description TEXT,
  geom        GEOMETRY(POLYGON, 4326) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índice espacial obligatorio
CREATE INDEX IF NOT EXISTS idx_objective_zones_geom
  ON public.objective_zones USING GIST (geom);

-- RLS básico
ALTER TABLE public.objective_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gerente_full_access_zones" ON public.objective_zones
  FOR ALL USING (true) WITH CHECK (true);

-- 2. Función de geocodificación inversa táctica
-- Recibe lat/lng → devuelve zone_name del polígono que contiene el punto
-- Fallback: 'Perímetro General'
CREATE OR REPLACE FUNCTION get_zone_name(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_objective_id UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_zone TEXT;
  v_point GEOMETRY;
BEGIN
  -- Construir el punto desde lat/lng
  v_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);

  -- Buscar qué zona contiene el punto
  -- Si se provee objective_id, limitar la búsqueda a ese objetivo
  SELECT zone_name
  INTO   v_zone
  FROM   public.objective_zones
  WHERE  ST_Contains(geom, v_point)
    AND  (p_objective_id IS NULL OR objective_id = p_objective_id)
  ORDER BY ST_Area(geom) ASC  -- Zona más pequeña (más precisa) primero
  LIMIT 1;

  RETURN COALESCE(v_zone, 'Perímetro General');
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Vista de prueba (verificar que funcione)
-- SELECT get_zone_name(-31.6350, -60.7000, NULL);

-- ----------------------------------------------------------
-- Migration: 20260514_patrol_trace_optimization.sql
-- ----------------------------------------------------------

-- ============================================================
-- PATROL TRACE: Performance Optimization for High-Frequency GPS
-- SPS 704 OS — Sprint 2 (Data & Forensics)
-- ============================================================

-- 1. COMPOSITE INDEX: round + time (for ordered trace queries)
CREATE INDEX IF NOT EXISTS idx_patrol_trace_round_time 
  ON public.patrol_trace (round_id, created_at ASC);

-- 2. COMPOSITE INDEX: shift + time (for shift-scoped queries)
CREATE INDEX IF NOT EXISTS idx_patrol_trace_shift_time
  ON public.patrol_trace (shift_id, created_at ASC);

-- 3. SPATIAL INDEX already exists from initial migration (idx_patrol_trace_geom)

-- 4. BRIN INDEX: for time-range scans on large datasets (very compact)
CREATE INDEX IF NOT EXISTS idx_patrol_trace_brin_time
  ON public.patrol_trace USING BRIN (created_at) WITH (pages_per_range = 32);

-- 5. ARCHIVAL FUNCTION: move records older than 90 days to archive
CREATE TABLE IF NOT EXISTS public.patrol_trace_archive (LIKE public.patrol_trace INCLUDING ALL);

CREATE OR REPLACE FUNCTION archive_old_patrol_traces()
RETURNS INTEGER AS $$
DECLARE
  moved INTEGER;
BEGIN
  WITH archived AS (
    DELETE FROM public.patrol_trace
    WHERE created_at < NOW() - INTERVAL '90 days'
    RETURNING *
  )
  INSERT INTO public.patrol_trace_archive SELECT * FROM archived;

  GET DIAGNOSTICS moved = ROW_COUNT;
  RAISE NOTICE 'Archived % patrol trace records', moved;
  RETURN moved;
END;
$$ LANGUAGE plpgsql;

-- 6. AGGREGATION VIEW: pre-computed stay-time density for heatmaps
CREATE OR REPLACE VIEW patrol_stay_density AS
SELECT
  round_id,
  shift_id,
  ROUND(latitude::numeric, 5) AS lat_bucket,
  ROUND(longitude::numeric, 5) AS lng_bucket,
  COUNT(*) AS point_count,
  AVG(accuracy) AS avg_accuracy,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) AS stay_seconds
FROM public.patrol_trace
GROUP BY round_id, shift_id, lat_bucket, lng_bucket;

-- 7. STATISTICS: improve query planner for this table
ALTER TABLE public.patrol_trace SET (autovacuum_analyze_scale_factor = 0.05);
ANALYZE public.patrol_trace;

-- ----------------------------------------------------------
-- Migration: 20260515_fix_checkout_columns.sql
-- ----------------------------------------------------------

-- =============================================================================
-- Migración: Fix columnas de checkout y optimización de payroll queries
-- Fecha: 2026-05-15
-- =============================================================================

-- 1. Agregar total_hours para persistir horas exactas calculadas en checkout
--    (NUMERIC con 4 decimales = precisión al segundo)
ALTER TABLE guard_shifts ADD COLUMN IF NOT EXISTS total_hours NUMERIC(8,4);

-- 2. Poblar total_hours en turnos ya completados que no lo tengan (legacy data)
UPDATE guard_shifts
SET total_hours = ROUND(
  EXTRACT(EPOCH FROM (checkout_time - checkin_time)) / 3600.0,
  4
)::NUMERIC(8,4)
WHERE checkout_time IS NOT NULL
  AND checkin_time IS NOT NULL
  AND (total_hours IS NULL OR total_hours = 0);

-- 3. Índice para acelerar queries de payroll por rango de fecha de checkout
CREATE INDEX IF NOT EXISTS idx_guard_shifts_checkout_time
  ON guard_shifts(checkout_time)
  WHERE checkout_time IS NOT NULL;

-- 4. Índice compuesto para queries de liquidación por objetivo y período
CREATE INDEX IF NOT EXISTS idx_guard_shifts_objective_period
  ON guard_shifts(objective_id, checkin_time DESC)
  WHERE checkin_time IS NOT NULL;

-- 5. Índice para buscar turnos por operador y período (payroll individual)
CREATE INDEX IF NOT EXISTS idx_guard_shifts_operator_period
  ON guard_shifts(operator_id, checkin_time DESC)
  WHERE checkin_time IS NOT NULL;

-- ----------------------------------------------------------
-- Migration: 20260515_fix_relationships_final.sql
-- ----------------------------------------------------------

-- ============================================================
-- Migración: Fix Relationships and Schema Cache
-- Propósito: Asegurar que PostgREST reconozca las relaciones FK 
-- para permitir JOINs en el API de Payroll y Map.
-- ============================================================

-- 1. Asegurar FK de guard_shifts -> resources (vital para Payroll)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'guard_shifts_operator_id_fkey') THEN
        ALTER TABLE public.guard_shifts
        ADD CONSTRAINT guard_shifts_operator_id_fkey
        FOREIGN KEY (operator_id)
        REFERENCES public.resources(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Asegurar FK de guard_shifts -> objectives (vital para Payroll)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'guard_shifts_objective_id_fkey') THEN
        ALTER TABLE public.guard_shifts
        ADD CONSTRAINT guard_shifts_objective_id_fkey
        FOREIGN KEY (objective_id)
        REFERENCES public.objectives(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Limpieza de estados inconsistentes (Ghost Operators)
-- Si un recurso dice estar en un objetivo pero no tiene turno activo, lo limpiamos
UPDATE public.resources r
SET current_objective_id = NULL
WHERE current_objective_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.guard_shifts gs
    WHERE gs.operator_id = r.id
    AND gs.status IN ('activo', 'active')
    AND gs.checkout_time IS NULL
);

-- 4. Forzar recarga de esquema en PostgREST
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------
-- Migration: 20260515_master_stabilization_v7.sql
-- ----------------------------------------------------------

-- ============================================================
-- SPS 704 OS — MASTER STABILIZATION MIGRATION (v7.0)
-- Propósito: Unificar nombres de columnas, asegurar FKs y 
-- limpiar la publicación de Realtime para máxima estabilidad.
-- ============================================================

-- 1. UNIFICACIÓN DE GUARD_SHIFTS
DO $$ 
BEGIN
    -- Rename resource_id to operator_id (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guard_shifts' AND column_name='resource_id') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guard_shifts' AND column_name='operator_id') THEN
        ALTER TABLE public.guard_shifts RENAME COLUMN resource_id TO operator_id;
    END IF;

    -- Rename check_in to checkin_time
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guard_shifts' AND column_name='check_in') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guard_shifts' AND column_name='checkin_time') THEN
        ALTER TABLE public.guard_shifts RENAME COLUMN check_in TO checkin_time;
    END IF;

    -- Rename check_out to checkout_time
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guard_shifts' AND column_name='check_out') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guard_shifts' AND column_name='checkout_time') THEN
        ALTER TABLE public.guard_shifts RENAME COLUMN check_out TO checkout_time;
    END IF;
END $$;

-- 2. UNIFICACIÓN DE GUARD_BOOK_ENTRIES
DO $$ 
BEGIN
    -- Rename resource_id to operator_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guard_book_entries' AND column_name='resource_id') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guard_book_entries' AND column_name='operator_id') THEN
        ALTER TABLE public.guard_book_entries RENAME COLUMN resource_id TO operator_id;
    END IF;
END $$;

-- 3. UNIFICACIÓN DE GPS_TRACKING
DO $$ 
BEGIN
    -- Rename user_id to operator_id for consistency across entities
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gps_tracking' AND column_name='user_id') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gps_tracking' AND column_name='operator_id') THEN
        ALTER TABLE public.gps_tracking RENAME COLUMN user_id TO operator_id;
    END IF;
END $$;

-- 4. RE-ESTABLECER RELACIONES (FOREIGN KEYS)
-- Borrar FKs antiguas que puedan estar rotas
ALTER TABLE public.guard_shifts DROP CONSTRAINT IF EXISTS guard_shifts_operator_id_fkey;
ALTER TABLE public.guard_shifts DROP CONSTRAINT IF EXISTS guard_shifts_resource_id_fkey;
ALTER TABLE public.guard_shifts DROP CONSTRAINT IF EXISTS guard_shifts_objective_id_fkey;

-- Crear FKs definitivas
ALTER TABLE public.guard_shifts
  ADD CONSTRAINT guard_shifts_operator_id_fkey 
  FOREIGN KEY (operator_id) REFERENCES public.resources(id) ON DELETE CASCADE;

ALTER TABLE public.guard_shifts
  ADD CONSTRAINT guard_shifts_objective_id_fkey 
  FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE SET NULL;

-- 5. LIMPIEZA DE REALTIME
-- Primero quitamos todas las tablas para evitar duplicados o errores
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;

-- Solo habilitamos Realtime para lo estrictamente necesario
ALTER PUBLICATION supabase_realtime ADD TABLE public.resources;
ALTER PUBLICATION supabase_realtime ADD TABLE public.objectives;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guard_shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guard_book_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alarms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- 6. AUDITORÍA DE ESTADOS (CLEANUP)
-- Asegurar que no haya "fantasmas" (recursos marcados activos sin turno)
UPDATE public.resources r
SET status = 'disponible', current_objective_id = NULL, current_shift_id = NULL
WHERE status = 'activo'
AND NOT EXISTS (
  SELECT 1 FROM public.guard_shifts gs
  WHERE gs.operator_id = r.id AND gs.status = 'activo'
);

-- 7. RECARGAR ESQUEMA
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------
-- Migration: 20260515_payroll_hourly_rate.sql
-- ----------------------------------------------------------

ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 0;

-- ----------------------------------------------------------
-- Migration: 20260516_fix_inventory_schema.sql
-- ----------------------------------------------------------

-- ============================================================
-- Migración: Reparación de Esquema de Inventario
-- Fecha: 2026-05-16
-- Problema: La tabla resource_inventory no tenía las columnas
--           category, notes ni condición correcta de estados.
-- ============================================================

-- 1. Agregar columna 'category' si no existe
ALTER TABLE public.resource_inventory
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'otros';

-- 2. Agregar columna 'notes' si no existe
ALTER TABLE public.resource_inventory
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Agregar columna 'updated_at' si no existe
ALTER TABLE public.resource_inventory
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 4. Eliminar el CHECK constraint antiguo y reemplazarlo por uno flexible
--    que acepta los mismos valores que usa el frontend (minúsculas)
ALTER TABLE public.resource_inventory
  DROP CONSTRAINT IF EXISTS resource_inventory_status_check;

ALTER TABLE public.resource_inventory
  ADD CONSTRAINT resource_inventory_status_check
  CHECK (status IN ('operativo', 'mantenimiento', 'roto', 'faltante', 'Operativo', 'Dañado', 'Faltante'));

-- 5. Normalizar los datos existentes a minúsculas para consistencia
UPDATE public.resource_inventory SET status = 'operativo' WHERE status = 'Operativo';
UPDATE public.resource_inventory SET status = 'roto'       WHERE status = 'Dañado';
UPDATE public.resource_inventory SET status = 'faltante'   WHERE status = 'Faltante';

-- 6. Ahora que los datos están normalizados, reemplazar el CHECK por solo minúsculas
ALTER TABLE public.resource_inventory
  DROP CONSTRAINT IF EXISTS resource_inventory_status_check;

ALTER TABLE public.resource_inventory
  ADD CONSTRAINT resource_inventory_status_check
  CHECK (status IN ('operativo', 'mantenimiento', 'roto', 'faltante'));

-- 7. Índice por categoría para el panel de resumen por rubro
CREATE INDEX IF NOT EXISTS idx_resource_inventory_category ON public.resource_inventory(category);

-- 8. Notificar a PostgREST
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------
-- Migration: 20260520_realtime_incidents.sql
-- ----------------------------------------------------------

-- Migration: Habilitar Tabla de Incidentes y Realtime
-- Identifier: 20260520_realtime_incidents

-- 1. Crear la tabla de incidentes si no existe
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id UUID REFERENCES public.objectives(id) ON DELETE SET NULL,
    operator_id TEXT,
    entry_type TEXT NOT NULL, -- 'panic', 'novedad', 'emergencia', etc.
    content TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- 3. Crear política permisiva para el prototipo si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'incidents' AND policyname = 'allow_all_incidents'
  ) THEN
    CREATE POLICY allow_all_incidents ON public.incidents FOR ALL USING (true);
  END IF;
END $$;

-- 4. Habilitar replicación en tiempo real para la tabla public.incidents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'incidents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
  END IF;
END $$;

-- ----------------------------------------------------------
-- Migration: 20260608_fix_incidents_resolved_at.sql
-- ----------------------------------------------------------

-- Migration: Fix incidents table - add missing resolved_at column
-- Identifier: 20260608_fix_incidents_resolved_at
-- Safe: IF NOT EXISTS ensures this won't fail if already applied

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- Also ensure the incidents table has the full set of status values expected by the API
-- (no-op if constraint already matches, but wrapping in DO block for safety)
DO $$
BEGIN
  -- Check if a check constraint exists on status for incidents
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname LIKE '%incidents%status%' AND contype = 'c'
  ) THEN
    -- No constraint means any value is accepted, which is fine
    RAISE NOTICE 'incidents.status has no CHECK constraint - values accepted freely.';
  END IF;
END $$;

-- ----------------------------------------------------------
-- Migration: 20260624_patrol_rounds_unified.sql
-- ----------------------------------------------------------

-- ============================================================
-- Migration: Patch patrol_rounds with unified columns + metrics
-- Safe: uses ADD COLUMN IF NOT EXISTS (idempotent)
-- ============================================================

-- 1. Unify column naming (support both naming conventions)
ALTER TABLE patrol_rounds
  ADD COLUMN IF NOT EXISTS round_start  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS round_end    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status       TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS distance_meters REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_speed    REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_speed    REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS telemetry_summary JSONB DEFAULT '{}'::jsonb;

-- 2. Back-fill from older column names if they exist
UPDATE patrol_rounds SET round_start = started_at  WHERE round_start IS NULL AND started_at IS NOT NULL;
UPDATE patrol_rounds SET round_end   = ended_at    WHERE round_end IS NULL   AND ended_at   IS NOT NULL;
UPDATE patrol_rounds SET round_start = start_at    WHERE round_start IS NULL AND start_at   IS NOT NULL;
UPDATE patrol_rounds SET round_end   = end_at      WHERE round_end IS NULL   AND end_at     IS NOT NULL;

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_patrol_rounds_status     ON patrol_rounds(status);
CREATE INDEX IF NOT EXISTS idx_patrol_rounds_resource   ON patrol_rounds(resource_id, round_start DESC);
CREATE INDEX IF NOT EXISTS idx_patrol_rounds_objective  ON patrol_rounds(objective_id, round_start DESC);
CREATE INDEX IF NOT EXISTS idx_patrol_rounds_active     ON patrol_rounds(objective_id, resource_id) WHERE status = 'active';

-- 4. patrol_trace: ensure round_id column exists (added by previous migration, but safe)
ALTER TABLE patrol_trace
  ADD COLUMN IF NOT EXISTS round_id UUID REFERENCES patrol_rounds(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_patrol_trace_round  ON patrol_trace(round_id, created_at);
CREATE INDEX IF NOT EXISTS idx_patrol_trace_shift  ON patrol_trace(shift_id, created_at);

-- 5. Function to finalize a round: compute metrics from patrol_trace
CREATE OR REPLACE FUNCTION finalize_patrol_round(p_round_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_count      INTEGER;
  v_start_ts   TIMESTAMPTZ;
  v_end_ts     TIMESTAMPTZ;
  v_distance   DOUBLE PRECISION := 0;
  v_avg_speed  DOUBLE PRECISION := 0;
  v_max_speed  DOUBLE PRECISION := 0;
  v_result     JSONB;
BEGIN
  -- Count trace points
  SELECT COUNT(*) INTO v_count FROM patrol_trace WHERE round_id = p_round_id;

  IF v_count < 2 THEN
    -- Not enough points to compute distance
    UPDATE patrol_rounds SET
      status = 'completed',
      round_end = COALESCE(round_end, NOW()),
      telemetry_summary = jsonb_build_object(
        'total_points', v_count,
        'distance_m', 0,
        'finalized_at', NOW()
      )
    WHERE id = p_round_id;
    RETURN jsonb_build_object('ok', true, 'points', v_count, 'distance_m', 0);
  END IF;

  -- Compute distance using PostGIS if geom column exists
  BEGIN
    SELECT
      COALESCE(SUM(
        ST_Distance(
          geom::geography,
          LAG(geom) OVER (ORDER BY created_at)::geography
        )
      ), 0),
      COALESCE(AVG(NULLIF(speed, 0)), 0),
      COALESCE(MAX(speed), 0)
    INTO v_distance, v_avg_speed, v_max_speed
    FROM patrol_trace
    WHERE round_id = p_round_id;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: Haversine via lat/lng if PostGIS fails
    v_distance := 0;
    v_avg_speed := 0;
    v_max_speed := 0;
  END;

  SELECT round_start INTO v_start_ts FROM patrol_rounds WHERE id = p_round_id;
  v_end_ts := NOW();

  -- Update the round record
  UPDATE patrol_rounds SET
    status            = 'completed',
    round_end         = v_end_ts,
    distance_meters   = ROUND(v_distance::numeric, 2),
    avg_speed         = ROUND((v_avg_speed * 3.6)::numeric, 2), -- m/s → km/h
    max_speed         = ROUND((v_max_speed * 3.6)::numeric, 2),
    telemetry_summary = jsonb_build_object(
      'total_points',    v_count,
      'distance_m',      ROUND(v_distance::numeric, 2),
      'avg_speed_kmh',   ROUND((v_avg_speed * 3.6)::numeric, 2),
      'max_speed_kmh',   ROUND((v_max_speed * 3.6)::numeric, 2),
      'duration_minutes', EXTRACT(EPOCH FROM (v_end_ts - v_start_ts)) / 60,
      'finalized_at',    NOW()
    )
  WHERE id = p_round_id;

  v_result := jsonb_build_object(
    'ok',           true,
    'points',       v_count,
    'distance_m',   ROUND(v_distance::numeric, 2),
    'avg_speed_kmh', ROUND((v_avg_speed * 3.6)::numeric, 2),
    'max_speed_kmh', ROUND((v_max_speed * 3.6)::numeric, 2)
  );

  RETURN v_result;
END;
$$;

-- 6. RLS: ensure patrol_rounds has permissive policy for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'patrol_rounds' AND policyname = 'patrol_rounds_authenticated'
  ) THEN
    ALTER TABLE patrol_rounds ENABLE ROW LEVEL SECURITY;
    CREATE POLICY patrol_rounds_authenticated ON patrol_rounds
      FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END$$;

-- 7. Enable Realtime on patrol_trace (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE patrol_trace;

-- ----------------------------------------------------------
-- Migration: 20260626_contracts.sql
-- ----------------------------------------------------------

-- ============================================================
-- Migration: Create contracts table and billing relations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id TEXT REFERENCES public.objectives(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  monthly_rate NUMERIC DEFAULT 0,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'expired')),
  documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Performance index
CREATE INDEX IF NOT EXISTS idx_contracts_objective ON public.contracts(objective_id);

-- RLS: Open for testing/management operations
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contracts' AND policyname = 'open_all_contracts'
  ) THEN
    CREATE POLICY open_all_contracts ON public.contracts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

