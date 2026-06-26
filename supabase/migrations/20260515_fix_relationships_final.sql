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
