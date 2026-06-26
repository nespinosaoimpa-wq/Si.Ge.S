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
