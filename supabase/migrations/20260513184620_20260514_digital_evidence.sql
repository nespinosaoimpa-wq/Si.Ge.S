-- Create digital evidence table
CREATE TABLE IF NOT EXISTS public.digital_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID REFERENCES public.objectives(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.digital_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow operators to insert evidence" ON public.digital_evidence
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all to view evidence" ON public.digital_evidence
  FOR SELECT USING (true);

-- Insert bucket for storage if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('backups', 'backups', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for backups bucket
CREATE POLICY "Public Access backups" ON storage.objects
  FOR SELECT USING (bucket_id = 'backups');

CREATE POLICY "Allow inserts backups" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'backups');
