-- Migration for real-time GPS tracking and Legal compliance

CREATE TABLE IF NOT EXISTS public.resource_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id TEXT REFERENCES public.resources(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    battery_level INTEGER,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    shift_id UUID REFERENCES public.guard_shifts(id)
);

-- Index for querying latest locations
CREATE INDEX IF NOT EXISTS idx_resource_locations_resource
ON public.resource_locations(resource_id, recorded_at DESC);

-- Allow public read/write for now
ALTER TABLE public.resource_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read/Write Access" ON public.resource_locations;
CREATE POLICY "Public Read/Write Access" ON public.resource_locations FOR ALL USING (true);

-- Enable Replication for Realtime updates
-- Check if table is already in publication to avoid errors (or simply try-catch equivalent in postgres if needed, 
-- but usually a single ADD TABLE is fine if it wasn't there before. 
-- In supabase, realtime publication is managed from the UI or via sql:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'resource_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_locations;
  END IF;
END
$$;

-- Create user_consents for Phase 4 compliance
CREATE TABLE IF NOT EXISTS public.user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id TEXT REFERENCES public.resources(id),
    consent_type TEXT NOT NULL, -- 'gps_tracking', 'cookies', 'terms'
    accepted BOOLEAN DEFAULT false,
    ip_address TEXT,
    user_agent TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read/Write Access" ON public.user_consents;
CREATE POLICY "Public Read/Write Access" ON public.user_consents FOR ALL USING (true);
