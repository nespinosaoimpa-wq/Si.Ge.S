-- Phase 3: Strict Geofencing with PostGIS

-- 1. Ensure objectives have geometric support
ALTER TABLE public.objectives 
ADD COLUMN IF NOT EXISTS location GEOMETRY(Point, 4326),
ADD COLUMN IF NOT EXISTS geofence_radius_meters DOUBLE PRECISION DEFAULT 70.0;

-- 2. Backfill location from lat/lng if not set
UPDATE public.objectives
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE location IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- 3. Create a spatial index for objectives
CREATE INDEX IF NOT EXISTS idx_objectives_location ON public.objectives USING GIST (location);

-- 4. Re-implement check_geofence using ST_DWithin (PostGIS)
-- This is much more accurate and faster than manual Haversine
CREATE OR REPLACE FUNCTION public.check_geofence(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_objective_id TEXT,
    p_radius_meters DOUBLE PRECISION DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_radius DOUBLE PRECISION;
    v_is_within BOOLEAN;
BEGIN
    -- Use provided radius or fall back to objective's default
    IF p_radius_meters IS NULL THEN
        SELECT geofence_radius_meters INTO v_radius
        FROM public.objectives
        WHERE id = p_objective_id;
    ELSE
        v_radius := p_radius_meters;
    END IF;

    -- Standard tolerance if not specified
    IF v_radius IS NULL THEN v_radius := 70.0; END IF;

    -- ST_DWithin uses the spatial index
    -- Note: We use geography for meters calculation
    SELECT ST_DWithin(
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        location::geography,
        v_radius
    ) INTO v_is_within
    FROM public.objectives
    WHERE id = p_objective_id;

    RETURN COALESCE(v_is_within, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
