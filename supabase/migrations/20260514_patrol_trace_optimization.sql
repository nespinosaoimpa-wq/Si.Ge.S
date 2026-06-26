-- ============================================================
-- PATROL TRACE: Performance Optimization for High-Frequency GPS
-- SPS 704 OS — Sprint 2 (Data & Forensics)
-- ============================================================

-- 1. COMPOSITE INDEX: round + time (for ordered trace queries)
CREATE INDEX IF NOT EXISTS idx_patrol_trace_round_time 
  ON public.patrol_trace (round_id, created_at ASC);

-- 2. COMPOSITE INDEX: shift + time (for shift-scoped queries)
CREATE INDEX IF NOT EXISTS idx_patrol_trace_shift_time
  ON public.patrol_trace (shift_id, created_at ASC);

-- 3. SPATIAL INDEX already exists from initial migration (idx_patrol_trace_geom)

-- 4. BRIN INDEX: for time-range scans on large datasets (very compact)
CREATE INDEX IF NOT EXISTS idx_patrol_trace_brin_time
  ON public.patrol_trace USING BRIN (created_at) WITH (pages_per_range = 32);

-- 5. ARCHIVAL FUNCTION: move records older than 90 days to archive
CREATE TABLE IF NOT EXISTS public.patrol_trace_archive (LIKE public.patrol_trace INCLUDING ALL);

CREATE OR REPLACE FUNCTION archive_old_patrol_traces()
RETURNS INTEGER AS $$
DECLARE
  moved INTEGER;
BEGIN
  WITH archived AS (
    DELETE FROM public.patrol_trace
    WHERE created_at < NOW() - INTERVAL '90 days'
    RETURNING *
  )
  INSERT INTO public.patrol_trace_archive SELECT * FROM archived;

  GET DIAGNOSTICS moved = ROW_COUNT;
  RAISE NOTICE 'Archived % patrol trace records', moved;
  RETURN moved;
END;
$$ LANGUAGE plpgsql;

-- 6. AGGREGATION VIEW: pre-computed stay-time density for heatmaps
CREATE OR REPLACE VIEW patrol_stay_density AS
SELECT
  round_id,
  shift_id,
  ROUND(latitude::numeric, 5) AS lat_bucket,
  ROUND(longitude::numeric, 5) AS lng_bucket,
  COUNT(*) AS point_count,
  AVG(accuracy) AS avg_accuracy,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) AS stay_seconds
FROM public.patrol_trace
GROUP BY round_id, shift_id, lat_bucket, lng_bucket;

-- 7. STATISTICS: improve query planner for this table
ALTER TABLE public.patrol_trace SET (autovacuum_analyze_scale_factor = 0.05);
ANALYZE public.patrol_trace;
