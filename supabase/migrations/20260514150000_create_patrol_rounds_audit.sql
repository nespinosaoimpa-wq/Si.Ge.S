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
