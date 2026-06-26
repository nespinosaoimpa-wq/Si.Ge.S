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
