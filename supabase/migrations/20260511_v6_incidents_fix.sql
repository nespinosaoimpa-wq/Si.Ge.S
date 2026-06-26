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
