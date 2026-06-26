-- ============================================================
-- Migración: Columnas de control de turnos y planillas
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columnas de duración y horas extra en guard_shifts
ALTER TABLE guard_shifts
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_shift_id UUID;

-- 2. Agregar columna de turno activo en resources
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS current_shift_id UUID REFERENCES guard_shifts(id) ON DELETE SET NULL;

-- 3. Agregar columna urgency en guard_book_entries
ALTER TABLE guard_book_entries
  ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal'
    CHECK (urgency IN ('normal', 'baja', 'media', 'alta', 'critica'));

-- 4. Tabla de alarmas (si no existe)
CREATE TABLE IF NOT EXISTS alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by TEXT NOT NULL,
  objective_id TEXT,
  alarm_type TEXT NOT NULL DEFAULT 'panico',
  message TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  acknowledged_by TEXT
);

-- 5. Enable Realtime para alarms
ALTER PUBLICATION supabase_realtime ADD TABLE alarms;

-- 6. RLS abierta temporal para alarms (restringir cuando Auth esté estabilizado)
ALTER TABLE alarms ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "open_alarms" ON alarms FOR ALL USING (true) WITH CHECK (true);

-- 7. RLS abierta temporal para guard_book_entries (Service Role la maneja en prod)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'guard_book_entries' AND policyname = 'open_all_gbe'
  ) THEN
    ALTER TABLE guard_book_entries ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "open_all_gbe" ON guard_book_entries FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 8. RLS abierta temporal para guard_shifts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'guard_shifts' AND policyname = 'open_all_gs'
  ) THEN
    ALTER TABLE guard_shifts ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "open_all_gs" ON guard_shifts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 9. Vista de resumen de planillas (compatible con el payroll API)
CREATE OR REPLACE VIEW payroll_summary AS
SELECT
  gs.operator_id,
  r.name AS operator_name,
  COUNT(*) AS shifts_count,
  COALESCE(SUM(gs.duration_minutes), 0) AS total_minutes,
  COALESCE(SUM(gs.overtime_minutes), 0) AS overtime_minutes,
  COALESCE(SUM(gs.duration_minutes) - SUM(gs.overtime_minutes), 0) AS regular_minutes,
  MIN(gs.checkin_time) AS first_shift,
  MAX(gs.checkin_time) AS last_shift
FROM guard_shifts gs
LEFT JOIN resources r ON r.id = gs.operator_id
WHERE gs.status = 'completado'
GROUP BY gs.operator_id, r.name;
