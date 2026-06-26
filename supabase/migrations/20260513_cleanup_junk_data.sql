-- 1. Clean up "junk" data in guard_shifts (inverted constructor remnants)
-- Delete shifts where operator_id contains non-UUID patterns or function snippets
DELETE FROM public.guard_shifts 
WHERE operator_id::text LIKE '%(pos)%' 
   OR operator_id::text LIKE '%function%'
   OR length(operator_id::text) > 50;

-- 2. Reset "ghost" resources that haven't moved in 24h
DO $$
BEGIN
  -- Use dynamic SQL to handle potentially missing columns
  EXECUTE 'UPDATE public.resources
           SET status = ''disponible''' 
           || CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'current_shift_id') THEN ', current_shift_id = NULL' ELSE '' END 
           || CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'current_objective_id') THEN ', current_objective_id = NULL' ELSE '' END 
           || ', latitude = NULL, longitude = NULL
           WHERE status IN (''activo'', ''active'') 
             AND (last_gps_update < NOW() - INTERVAL ''24 hours'' OR last_gps_update IS NULL)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error resetting resources: %', SQLERRM;
END
$$;

-- 3. Ensure objectives table has the correct column for radius if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objectives' AND column_name = 'geofence_radius_meters') THEN
    ALTER TABLE public.objectives ADD COLUMN geofence_radius_meters INTEGER DEFAULT 70;
  END IF;
END
$$;

-- 4. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
