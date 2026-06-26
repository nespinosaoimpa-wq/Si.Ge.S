-- Final Phase: Incidence Reporting & Static Mapping

-- 1. Optimized table for Geofencing Incidents
CREATE TABLE IF NOT EXISTS public.geofencing_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID REFERENCES public.guard_shifts(id) ON DELETE CASCADE,
    operator_id TEXT,
    objective_id UUID REFERENCES public.objectives(id) ON DELETE CASCADE,
    exit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    return_at TIMESTAMP WITH TIME ZONE,
    max_distance_meters DOUBLE PRECISION DEFAULT 0,
    map_snapshot_url TEXT,
    supervisor_comment TEXT,
    status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'justificado', 'sancionado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_geofence_incidents_shift ON public.geofencing_incidents(shift_id);

-- 3. Storage Bucket for Static Maps
-- Note: This usually needs to be created via Supabase UI or API, but we ensure the table logic is ready.
-- We will assume a bucket named 'incidents' exists.
