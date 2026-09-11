-- ================================================================
-- SIGPAD — SAAS FINANCIAL RECORDS (Control de Gastos e Inversiones)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.saas_financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('gasto', 'ingreso', 'inversion')),
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'ARS',
  status VARCHAR(20) DEFAULT 'pagado',
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_saas_financial_type ON public.saas_financial_records(type);
CREATE INDEX IF NOT EXISTS idx_saas_financial_created ON public.saas_financial_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saas_financial_category ON public.saas_financial_records(category);

-- RLS
ALTER TABLE public.saas_financial_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_service_role" ON public.saas_financial_records;
CREATE POLICY "allow_service_role" ON public.saas_financial_records FOR ALL USING (true) WITH CHECK (true);
