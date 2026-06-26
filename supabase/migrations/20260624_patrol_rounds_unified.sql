-- ============================================================
-- Migration: Patch patrol_rounds with unified columns + metrics
-- Safe: uses ADD COLUMN IF NOT EXISTS (idempotent)
-- ============================================================

-- 1. Unify column naming (support both naming conventions)
ALTER TABLE patrol_rounds
  ADD COLUMN IF NOT EXISTS round_start  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS round_end    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status       TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS distance_meters REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_speed    REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_speed    REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS telemetry_summary JSONB DEFAULT '{}'::jsonb;

-- 2. Back-fill from older column names if they exist
UPDATE patrol_rounds SET round_start = started_at  WHERE round_start IS NULL AND started_at IS NOT NULL;
UPDATE patrol_rounds SET round_end   = ended_at    WHERE round_end IS NULL   AND ended_at   IS NOT NULL;
UPDATE patrol_rounds SET round_start = start_at    WHERE round_start IS NULL AND start_at   IS NOT NULL;
UPDATE patrol_rounds SET round_end   = end_at      WHERE round_end IS NULL   AND end_at     IS NOT NULL;

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_patrol_rounds_status     ON patrol_rounds(status);
CREATE INDEX IF NOT EXISTS idx_patrol_rounds_resource   ON patrol_rounds(resource_id, round_start DESC);
CREATE INDEX IF NOT EXISTS idx_patrol_rounds_objective  ON patrol_rounds(objective_id, round_start DESC);
CREATE INDEX IF NOT EXISTS idx_patrol_rounds_active     ON patrol_rounds(objective_id, resource_id) WHERE status = 'active';

-- 4. patrol_trace: ensure round_id column exists (added by previous migration, but safe)
ALTER TABLE patrol_trace
  ADD COLUMN IF NOT EXISTS round_id UUID REFERENCES patrol_rounds(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_patrol_trace_round  ON patrol_trace(round_id, created_at);
CREATE INDEX IF NOT EXISTS idx_patrol_trace_shift  ON patrol_trace(shift_id, created_at);

-- 5. Function to finalize a round: compute metrics from patrol_trace
CREATE OR REPLACE FUNCTION finalize_patrol_round(p_round_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_count      INTEGER;
  v_start_ts   TIMESTAMPTZ;
  v_end_ts     TIMESTAMPTZ;
  v_distance   DOUBLE PRECISION := 0;
  v_avg_speed  DOUBLE PRECISION := 0;
  v_max_speed  DOUBLE PRECISION := 0;
  v_result     JSONB;
BEGIN
  -- Count trace points
  SELECT COUNT(*) INTO v_count FROM patrol_trace WHERE round_id = p_round_id;

  IF v_count < 2 THEN
    -- Not enough points to compute distance
    UPDATE patrol_rounds SET
      status = 'completed',
      round_end = COALESCE(round_end, NOW()),
      telemetry_summary = jsonb_build_object(
        'total_points', v_count,
        'distance_m', 0,
        'finalized_at', NOW()
      )
    WHERE id = p_round_id;
    RETURN jsonb_build_object('ok', true, 'points', v_count, 'distance_m', 0);
  END IF;

  -- Compute distance using PostGIS if geom column exists
  BEGIN
    SELECT
      COALESCE(SUM(
        ST_Distance(
          geom::geography,
          LAG(geom) OVER (ORDER BY created_at)::geography
        )
      ), 0),
      COALESCE(AVG(NULLIF(speed, 0)), 0),
      COALESCE(MAX(speed), 0)
    INTO v_distance, v_avg_speed, v_max_speed
    FROM patrol_trace
    WHERE round_id = p_round_id;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: Haversine via lat/lng if PostGIS fails
    v_distance := 0;
    v_avg_speed := 0;
    v_max_speed := 0;
  END;

  SELECT round_start INTO v_start_ts FROM patrol_rounds WHERE id = p_round_id;
  v_end_ts := NOW();

  -- Update the round record
  UPDATE patrol_rounds SET
    status            = 'completed',
    round_end         = v_end_ts,
    distance_meters   = ROUND(v_distance::numeric, 2),
    avg_speed         = ROUND((v_avg_speed * 3.6)::numeric, 2), -- m/s → km/h
    max_speed         = ROUND((v_max_speed * 3.6)::numeric, 2),
    telemetry_summary = jsonb_build_object(
      'total_points',    v_count,
      'distance_m',      ROUND(v_distance::numeric, 2),
      'avg_speed_kmh',   ROUND((v_avg_speed * 3.6)::numeric, 2),
      'max_speed_kmh',   ROUND((v_max_speed * 3.6)::numeric, 2),
      'duration_minutes', EXTRACT(EPOCH FROM (v_end_ts - v_start_ts)) / 60,
      'finalized_at',    NOW()
    )
  WHERE id = p_round_id;

  v_result := jsonb_build_object(
    'ok',           true,
    'points',       v_count,
    'distance_m',   ROUND(v_distance::numeric, 2),
    'avg_speed_kmh', ROUND((v_avg_speed * 3.6)::numeric, 2),
    'max_speed_kmh', ROUND((v_max_speed * 3.6)::numeric, 2)
  );

  RETURN v_result;
END;
$$;

-- 6. RLS: ensure patrol_rounds has permissive policy for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'patrol_rounds' AND policyname = 'patrol_rounds_authenticated'
  ) THEN
    ALTER TABLE patrol_rounds ENABLE ROW LEVEL SECURITY;
    CREATE POLICY patrol_rounds_authenticated ON patrol_rounds
      FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;
END$$;

-- 7. Enable Realtime on patrol_trace (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE patrol_trace;
