-- Forensic Traceability Table for Patrol Rounds
CREATE TABLE IF NOT EXISTS public.patrol_trace (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID REFERENCES public.guard_shifts(id) ON DELETE CASCADE,
    round_id UUID REFERENCES public.patrol_rounds(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOGRAPHY(POINT, 4326),
    accuracy DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to automatically update geom from lat/lng
CREATE OR REPLACE FUNCTION update_patrol_trace_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_patrol_trace_geom ON public.patrol_trace;
CREATE TRIGGER trg_update_patrol_trace_geom
    BEFORE INSERT ON public.patrol_trace
    FOR EACH ROW
    EXECUTE FUNCTION update_patrol_trace_geom();

-- Indexes for spatial and temporal performance
CREATE INDEX IF NOT EXISTS idx_patrol_trace_geom ON public.patrol_trace USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_patrol_trace_round ON public.patrol_trace(round_id, created_at);

-- Enable Realtime for live trace drawing if needed
ALTER PUBLICATION supabase_realtime ADD TABLE patrol_trace;

-- Open RLS for development
ALTER TABLE patrol_trace ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_all_trace" ON patrol_trace FOR ALL USING (true) WITH CHECK (true);
