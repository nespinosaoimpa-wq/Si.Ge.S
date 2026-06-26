-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometric column to guard_shifts for storing the final patrol route
ALTER TABLE public.guard_shifts 
ADD COLUMN IF NOT EXISTS patrol_route GEOMETRY(LineString, 4326);

-- Create a table for 'Cold' historical data if it doesn't exist
-- This table stores individual points but with geometric support for spatial queries
CREATE TABLE IF NOT EXISTS public.gps_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID REFERENCES public.guard_shifts(id) ON DELETE CASCADE,
    operator_id TEXT, -- No FK to avoid type mismatch with resources(id) which can be UUID or TEXT depending on session
    location GEOMETRY(Point, 4326) NOT NULL,
    accuracy DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for spatial queries
CREATE INDEX IF NOT EXISTS idx_gps_history_location ON public.gps_history USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_gps_history_shift ON public.gps_history (shift_id);

-- Function to consolidate points into a LineString and simplify it
CREATE OR REPLACE FUNCTION consolidate_patrol_route(p_shift_id UUID)
RETURNS GEOMETRY AS $$
DECLARE
    v_route GEOMETRY;
BEGIN
    -- 1. Create LineString from points ordered by time
    -- 2. Simplify using Ramer-Douglas-Peucker (tolerance in degrees, ~0.0001 is approx 11m)
    SELECT ST_Simplify(ST_MakeLine(location ORDER BY recorded_at), 0.00005)
    INTO v_route
    FROM public.gps_history
    WHERE shift_id = p_shift_id;

    -- Update the shift record
    UPDATE public.guard_shifts
    SET patrol_route = v_route
    WHERE id = p_shift_id;

    RETURN v_route;
END;
$$ LANGUAGE plpgsql;
