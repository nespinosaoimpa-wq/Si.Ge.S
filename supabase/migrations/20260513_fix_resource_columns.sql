-- Add missing columns to resources table for shift tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'current_shift_id') THEN
    ALTER TABLE public.resources ADD COLUMN current_shift_id UUID REFERENCES public.guard_shifts(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'current_objective_id') THEN
    ALTER TABLE public.resources ADD COLUMN current_objective_id UUID REFERENCES public.objectives(id);
  END IF;
END
$$;

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
