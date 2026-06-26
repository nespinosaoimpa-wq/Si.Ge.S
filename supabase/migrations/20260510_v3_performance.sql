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
