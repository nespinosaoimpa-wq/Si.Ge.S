-- ============================================================
-- Migración v4.0: Esquema Consolidado (EJECUTAR EN SUPABASE)
-- Resuelve: "column does not exist", relaciones rotas, y lentitud
-- ============================================================

-- 1. Columnas base de resources (pueden no existir en bases antiguas)
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS dni TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS hiring_date DATE,
  ADD COLUMN IF NOT EXISTS salary NUMERIC,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to TEXT;

-- 2. Columnas extendidas del legajo (enhanced_employee_records)
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS shirt_size TEXT,
  ADD COLUMN IF NOT EXISTS pants_size TEXT,
  ADD COLUMN IF NOT EXISTS boot_size TEXT,
  ADD COLUMN IF NOT EXISTS last_uniform_delivery DATE,
  ADD COLUMN IF NOT EXISTS credential_number TEXT,
  ADD COLUMN IF NOT EXISTS credential_expiry DATE,
  ADD COLUMN IF NOT EXISTS psych_expiry DATE,
  ADD COLUMN IF NOT EXISTS license_expiry DATE,
  ADD COLUMN IF NOT EXISTS training_expiry DATE,
  ADD COLUMN IF NOT EXISTS sanctions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS medical_records JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS leaves JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- 3. Columnas GPS en resources (para el mapa en vivo)
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS speed DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS heading DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_gps_update TIMESTAMPTZ;

-- 4. Relaciones FK (para que PostgREST pueda hacer JOINs)
ALTER TABLE public.resources
  DROP CONSTRAINT IF EXISTS resources_current_objective_id_fkey;
ALTER TABLE public.resources
  ADD CONSTRAINT resources_current_objective_id_fkey
  FOREIGN KEY (current_objective_id)
  REFERENCES public.objectives(id)
  ON DELETE SET NULL;

ALTER TABLE public.guard_shifts
  DROP CONSTRAINT IF EXISTS guard_shifts_objective_id_fkey;
ALTER TABLE public.guard_shifts
  ADD CONSTRAINT guard_shifts_objective_id_fkey
  FOREIGN KEY (objective_id)
  REFERENCES public.objectives(id)
  ON DELETE SET NULL;

-- 5. Índices de performance
CREATE INDEX IF NOT EXISTS idx_resources_status ON public.resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_email ON public.resources(email);
CREATE INDEX IF NOT EXISTS idx_guard_shifts_operator ON public.guard_shifts(operator_id, checkin_time DESC);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_user_time ON public.gps_tracking(user_id, recorded_at DESC);

-- 6. Tablas de inventario (si no existen)
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  condition TEXT NOT NULL DEFAULT 'operativo',
  objective_id UUID REFERENCES public.objectives(id) ON DELETE SET NULL,
  serial_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID,
  operator_id TEXT,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'operativo',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Tabla de tracking de rondines (si no existe)
CREATE TABLE IF NOT EXISTS public.patrol_track_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.patrol_rounds(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patrol_tracks_round ON public.patrol_track_points(round_id, recorded_at);

-- 8. Limpieza: Guardias inactivos no deben aparecer en el mapa
UPDATE public.resources
SET latitude = NULL, longitude = NULL
WHERE status NOT IN ('activo', 'active');

-- 9. Notificar a PostgREST que recargue el esquema (VITAL)
NOTIFY pgrst, 'reload schema';
