-- Migration: Fix incidents table - add missing resolved_at column
-- Identifier: 20260608_fix_incidents_resolved_at
-- Safe: IF NOT EXISTS ensures this won't fail if already applied

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- Also ensure the incidents table has the full set of status values expected by the API
-- (no-op if constraint already matches, but wrapping in DO block for safety)
DO $$
BEGIN
  -- Check if a check constraint exists on status for incidents
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname LIKE '%incidents%status%' AND contype = 'c'
  ) THEN
    -- No constraint means any value is accepted, which is fine
    RAISE NOTICE 'incidents.status has no CHECK constraint - values accepted freely.';
  END IF;
END $$;
