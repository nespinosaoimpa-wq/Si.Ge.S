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
