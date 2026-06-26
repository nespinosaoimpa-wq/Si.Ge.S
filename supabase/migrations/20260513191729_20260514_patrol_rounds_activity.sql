CREATE TABLE IF NOT EXISTS public.patrol_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
    objective_id UUID REFERENCES public.objectives(id) ON DELETE CASCADE,
    start_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_at TIMESTAMP WITH TIME ZONE,
    distance_km NUMERIC DEFAULT 0
);

ALTER TABLE public.patrol_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to insert patrol_rounds"
ON public.patrol_rounds FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow public read access for patrol_rounds"
ON public.patrol_rounds FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to update patrol_rounds"
ON public.patrol_rounds FOR UPDATE TO authenticated USING (true);

-- Link patrol_trace
ALTER TABLE public.patrol_trace ADD COLUMN IF NOT EXISTS round_id UUID REFERENCES public.patrol_rounds(id) ON DELETE CASCADE;

-- Link incidents (already have latitude, longitude in earlier migrations, just adding round_id)
ALTER TABLE public.guard_book_entries ADD COLUMN IF NOT EXISTS round_id UUID REFERENCES public.patrol_rounds(id) ON DELETE CASCADE;
