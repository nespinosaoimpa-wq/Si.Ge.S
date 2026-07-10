-- ============================================================
-- SIGPAD — MIGRACIÓN PARTE 1/2: ESTRUCTURA
-- ⚠️ Ejecutar PRIMERO este script. Esperar que diga "Success".
-- Luego ejecutar el script PARTE 2/2.
-- ============================================================

-- ── Tabla de Inquilinos (Tenants / Empresas) ─────────────────
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  country_code TEXT DEFAULT 'ar',
  timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#0f4c5c',
  billing_status TEXT DEFAULT 'trial'
    CHECK (billing_status IN ('trial','active','suspended','cancelled')),
  plan_tier TEXT DEFAULT 'starter'
    CHECK (plan_tier IN ('starter','professional','enterprise')),
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days'),
  billing_cycle_day INTEGER DEFAULT 1,
  admin_email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  max_operators INTEGER DEFAULT 20,
  max_objectives INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ── Tabla historial de facturación ───────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'subscription_started','payment_received','payment_failed',
    'plan_upgraded','plan_downgraded','trial_started','trial_expired',
    'account_suspended','account_reactivated'
  )),
  amount NUMERIC(12,2),
  currency TEXT DEFAULT 'ARS',
  period_start DATE,
  period_end DATE,
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- ── Añadir tenant_id a todas las tablas existentes ───────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.objectives
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.guard_shifts
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.guard_book_entries
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.patrol_rounds
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.patrol_track_points
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.patrol_trace
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.patrol_checkpoint_logs
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.alarms
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.checkpoints
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.gps_tracking
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.inventory_handoffs
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.geofence_alerts
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.authorized_users
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.patrol_rounds_audit
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.objective_zones
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- ── Índices de rendimiento ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_tenant         ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_objectives_tenant    ON public.objectives(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resources_tenant     ON public.resources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guard_shifts_tenant  ON public.guard_shifts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guard_book_tenant    ON public.guard_book_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patrol_rounds_tenant ON public.patrol_rounds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patrol_trace_tenant  ON public.patrol_trace(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_tenant  ON public.gps_tracking(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alarms_tenant        ON public.alarms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant     ON public.inventory_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant     ON public.contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_geofence_tenant      ON public.geofence_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_authorized_tenant    ON public.authorized_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_tenant       ON public.billing_events(tenant_id, created_at DESC);

-- ✅ PARTE 1 COMPLETADA — Ahora ejecutá el script PARTE 2
NOTIFY pgrst, 'reload schema';
