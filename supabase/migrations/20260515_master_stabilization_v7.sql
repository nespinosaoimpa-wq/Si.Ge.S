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
