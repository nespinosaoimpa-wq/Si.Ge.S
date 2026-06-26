-- Add avatar_url to resources table
ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Index for faster lookups by email if needed
CREATE INDEX IF NOT EXISTS idx_resources_email ON public.resources(email);
