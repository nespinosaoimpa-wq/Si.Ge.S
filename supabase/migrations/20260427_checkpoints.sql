-- Patrol Management: Checkpoints System
-- Version: 2026.04.27
-- Description: Adds strategic checkpoints for each objective and improves patrol round tracking.

-- 1. Strategic Checkpoints
CREATE TABLE IF NOT EXISTS public.checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id TEXT REFERENCES public.objectives(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    qr_code TEXT UNIQUE, -- QR content to validate
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Patrol Checkpoint Logs (Validation history)
CREATE TABLE IF NOT EXISTS public.patrol_checkpoint_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID REFERENCES public.patrol_rounds(id) ON DELETE CASCADE,
    checkpoint_id UUID REFERENCES public.checkpoints(id) ON DELETE CASCADE,
    resource_id TEXT REFERENCES public.resources(id),
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    photo_url TEXT
);

-- 3. RLS
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrol_checkpoint_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for all" ON public.checkpoints FOR SELECT USING (true);
CREATE POLICY "Enable all for managers" ON public.checkpoints FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role = 'gerente'
  )
);

CREATE POLICY "Enable all for anyone" ON public.patrol_checkpoint_logs FOR ALL USING (true);
