-- =============================================================================
-- Migración: Fix columnas de checkout y optimización de payroll queries
-- Fecha: 2026-05-15
-- =============================================================================

-- 1. Agregar total_hours para persistir horas exactas calculadas en checkout
--    (NUMERIC con 4 decimales = precisión al segundo)
ALTER TABLE guard_shifts ADD COLUMN IF NOT EXISTS total_hours NUMERIC(8,4);

-- 2. Poblar total_hours en turnos ya completados que no lo tengan (legacy data)
UPDATE guard_shifts
SET total_hours = ROUND(
  EXTRACT(EPOCH FROM (checkout_time - checkin_time)) / 3600.0,
  4
)::NUMERIC(8,4)
WHERE checkout_time IS NOT NULL
  AND checkin_time IS NOT NULL
  AND (total_hours IS NULL OR total_hours = 0);

-- 3. Índice para acelerar queries de payroll por rango de fecha de checkout
CREATE INDEX IF NOT EXISTS idx_guard_shifts_checkout_time
  ON guard_shifts(checkout_time)
  WHERE checkout_time IS NOT NULL;

-- 4. Índice compuesto para queries de liquidación por objetivo y período
CREATE INDEX IF NOT EXISTS idx_guard_shifts_objective_period
  ON guard_shifts(objective_id, checkin_time DESC)
  WHERE checkin_time IS NOT NULL;

-- 5. Índice para buscar turnos por operador y período (payroll individual)
CREATE INDEX IF NOT EXISTS idx_guard_shifts_operator_period
  ON guard_shifts(operator_id, checkin_time DESC)
  WHERE checkin_time IS NOT NULL;
