-- Migration: Add Real-time Metadata to Resources
-- This enables the manager dashboard to see precision and speed without querying logs.

ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS accuracy DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS speed DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS heading DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS battery_level INTEGER,
ADD COLUMN IF NOT EXISTS last_gps_update TIMESTAMP WITH TIME ZONE;

-- Add comment for clarity
COMMENT ON COLUMN public.resources.accuracy IS 'GPS accuracy in meters';
COMMENT ON COLUMN public.resources.speed IS 'Speed in meters per second';
COMMENT ON COLUMN public.resources.heading IS 'Heading in degrees (0-360)';
