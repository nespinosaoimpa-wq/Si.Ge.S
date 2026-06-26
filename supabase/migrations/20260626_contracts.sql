-- ============================================================
-- Migration: Create contracts table and billing relations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id TEXT REFERENCES public.objectives(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  monthly_rate NUMERIC DEFAULT 0,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'expired')),
  documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Performance index
CREATE INDEX IF NOT EXISTS idx_contracts_objective ON public.contracts(objective_id);

-- RLS: Open for testing/management operations
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contracts' AND policyname = 'open_all_contracts'
  ) THEN
    CREATE POLICY open_all_contracts ON public.contracts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
