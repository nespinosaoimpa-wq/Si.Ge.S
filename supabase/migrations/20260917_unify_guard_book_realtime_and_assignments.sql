-- ==============================================================================
-- MIGRATION: 20260917_unify_guard_book_realtime_and_assignments.sql
-- DESCRIPCIÓN: Consolidación limpia e idempotente de columnas multi-empresa, 
--              tiempo real (REPLICA IDENTITY FULL) e índices de alta concurrencia
-- ==============================================================================

-- 1. TABLA INCIDENTS: Asegurar columnas requeridas y tipos consistentes
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id UUID REFERENCES public.objectives(id) ON DELETE SET NULL,
    operator_id TEXT,
    entry_type TEXT NOT NULL,
    content TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status TEXT DEFAULT 'abierto',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.incidents
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS audio_url TEXT,
    ADD COLUMN IF NOT EXISTS operator_name TEXT,
    ADD COLUMN IF NOT EXISTS comment TEXT;

-- 2. TABLA GUARD_BOOK_ENTRIES: Asegurar columnas requeridas
ALTER TABLE public.guard_book_entries
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS operator_id TEXT,
    ADD COLUMN IF NOT EXISTS resource_id TEXT,
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- 3. HABILITAR REPLICA IDENTITY FULL PARA TRANSMISIÓN COMPLETA EN TIEMPO REAL
-- Esto garantiza que los eventos UPDATE envíen tanto el registro nuevo como el anterior en Supabase Realtime
ALTER TABLE public.guard_book_entries REPLICA IDENTITY FULL;
ALTER TABLE public.incidents REPLICA IDENTITY FULL;
ALTER TABLE public.guard_shifts REPLICA IDENTITY FULL;
ALTER TABLE public.alarms REPLICA IDENTITY FULL;
ALTER TABLE public.resources REPLICA IDENTITY FULL;

-- 4. ASEGURAR PUBLICACIÓN SUPABASE_REALTIME
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'guard_book_entries') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.guard_book_entries;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'incidents') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'guard_shifts') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.guard_shifts;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'alarms') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.alarms;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'resources') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.resources;
    END IF;
END $$;

-- 5. ÍNDICES DE RENDIMIENTO Y ESCALABILIDAD MULTI-TENANT
CREATE INDEX IF NOT EXISTS idx_guard_book_tenant_obj 
    ON public.guard_book_entries (tenant_id, objective_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_tenant_active 
    ON public.incidents (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guard_shifts_tenant_active 
    ON public.guard_shifts (tenant_id, status, checkin_time DESC);

CREATE INDEX IF NOT EXISTS idx_resources_current_obj 
    ON public.resources (current_objective_id) WHERE current_objective_id IS NOT NULL;
