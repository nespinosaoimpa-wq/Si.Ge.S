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
