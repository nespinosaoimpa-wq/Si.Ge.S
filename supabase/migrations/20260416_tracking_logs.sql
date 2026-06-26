-- 1. Create tracking_logs table
CREATE TABLE IF NOT EXISTS public.tracking_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guard_log_id UUID REFERENCES public.guard_logs(id),
    resource_id TEXT REFERENCES public.resources(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIME
);

-- 2. Enable RLS
ALTER TABLE public.tracking_logs ENABLE ROW LEVEL SECURITY;

-- 3. Add default all-access policy for development
CREATE POLICY "Public Read/Write Access" ON public.tracking_logs FOR ALL USING (true);
