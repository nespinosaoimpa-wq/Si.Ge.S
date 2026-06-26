-- Restore relationship metadata for patrol_rounds to enable PostgREST joins
ALTER TABLE public.patrol_rounds
  DROP CONSTRAINT IF EXISTS patrol_rounds_resource_id_fkey;

ALTER TABLE public.patrol_rounds
  ADD CONSTRAINT patrol_rounds_resource_id_fkey 
  FOREIGN KEY (resource_id) 
  REFERENCES public.resources(id) 
  ON DELETE SET NULL;

ALTER TABLE public.patrol_rounds
  DROP CONSTRAINT IF EXISTS patrol_rounds_objective_id_fkey;

ALTER TABLE public.patrol_rounds
  ADD CONSTRAINT patrol_rounds_objective_id_fkey 
  FOREIGN KEY (objective_id) 
  REFERENCES public.objectives(id) 
  ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';
