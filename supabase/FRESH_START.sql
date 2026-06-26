-- ============================================================
-- Si.Ge.S — FRESH START: Schema completo desde cero
-- Ejecutar en Supabase SQL Editor (una sola vez en DB vacía)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PARTE 1: TABLAS BASE (creación desde cero)
-- ─────────────────────────────────────────────────────────────

-- 1. TABLA: objectives (puestos/clientes)
CREATE TABLE IF NOT EXISTS public.objectives (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  address TEXT,
  client_name TEXT,
  contact_phone TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geofence_radius DOUBLE PRECISION DEFAULT 200.0,
  is_active BOOLEAN DEFAULT true,
  hourly_billing_rate NUMERIC(10,2) DEFAULT 4500.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objectives' AND policyname='open_all_objectives') THEN
    CREATE POLICY "open_all_objectives" ON public.objectives FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. TABLA: resources (personal/guardias)
CREATE TABLE IF NOT EXISTS public.resources (
  id TEXT PRIMARY KEY DEFAULT ('S-' || floor(random()*9000+1000)::text),
  name TEXT NOT NULL,
  role TEXT,
  status TEXT DEFAULT 'active',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  battery_level INTEGER,
  last_gps_update TIMESTAMPTZ,
  phone TEXT,
  email TEXT UNIQUE,
  dni TEXT,
  address TEXT,
  hiring_date DATE DEFAULT CURRENT_DATE,
  salary TEXT,
  avatar_url TEXT,
  assigned_to TEXT,
  -- Tallas
  shirt_size TEXT,
  pants_size TEXT,
  boot_size TEXT,
  last_uniform_delivery DATE,
  -- Credenciales
  credential_number TEXT,
  credential_expiry DATE,
  psych_expiry DATE,
  license_expiry DATE,
  training_expiry DATE,
  -- Legajo digital
  sanctions JSONB DEFAULT '[]'::jsonb,
  medical_records JSONB DEFAULT '[]'::jsonb,
  leaves JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  performance_data JSONB DEFAULT '[{"month":"Enero","hours":160,"incidents":0,"punctuality":100}]'::jsonb,
  -- Nómina
  hourly_pay_rate NUMERIC(10,2) DEFAULT 3500.00,
  -- Turno y objetivo actuales
  current_shift_id UUID,
  current_objective_id TEXT REFERENCES public.objectives(id) ON DELETE SET NULL,
  -- Perfil vinculado
  profile_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resources' AND policyname='open_all_resources') THEN
    CREATE POLICY "open_all_resources" ON public.resources FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. TABLA: users (sync con auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'operador',
  resource_id TEXT REFERENCES public.resources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='open_all_users') THEN
    CREATE POLICY "open_all_users" ON public.users FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. TABLA: profiles (avatars)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='open_all_profiles') THEN
    CREATE POLICY "open_all_profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. TABLA: guard_shifts (turnos/fichajes)
CREATE TABLE IF NOT EXISTS public.guard_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id TEXT NOT NULL,
  objective_id TEXT REFERENCES public.objectives(id) ON DELETE SET NULL,
  checkin_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checkout_time TIMESTAMPTZ,
  checkin_latitude DOUBLE PRECISION,
  checkin_longitude DOUBLE PRECISION,
  checkout_latitude DOUBLE PRECISION,
  checkout_longitude DOUBLE PRECISION,
  checkin_within_geofence BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'activo',
  duration_minutes INTEGER DEFAULT 0,
  break_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.guard_shifts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='guard_shifts' AND policyname='open_all_gs') THEN
    CREATE POLICY "open_all_gs" ON public.guard_shifts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Actualizar FK en resources ahora que guard_shifts existe
ALTER TABLE public.resources
  DROP CONSTRAINT IF EXISTS resources_current_shift_id_fkey;
ALTER TABLE public.resources
  ADD CONSTRAINT resources_current_shift_id_fkey
  FOREIGN KEY (current_shift_id) REFERENCES public.guard_shifts(id) ON DELETE SET NULL;

-- 6. TABLA: guard_book_entries (libro de guardia)
CREATE TABLE IF NOT EXISTS public.guard_book_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id TEXT REFERENCES public.objectives(id) ON DELETE SET NULL,
  operator_id TEXT,
  entry_type TEXT NOT NULL DEFAULT 'novedad',
  content TEXT NOT NULL,
  photo_urls TEXT[],
  image_url TEXT,
  audio_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal','baja','media','alta','critica')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.guard_book_entries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='guard_book_entries' AND policyname='open_all_gbe') THEN
    CREATE POLICY "open_all_gbe" ON public.guard_book_entries FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 7. TABLA: patrol_rounds (rondines)
CREATE TABLE IF NOT EXISTS public.patrol_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id TEXT REFERENCES public.objectives(id) ON DELETE SET NULL,
  operator_id TEXT,
  round_start TIMESTAMPTZ DEFAULT NOW(),
  round_end TIMESTAMPTZ,
  checkpoints_reached JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.patrol_rounds ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patrol_rounds' AND policyname='open_all_pr') THEN
    CREATE POLICY "open_all_pr" ON public.patrol_rounds FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 8. TABLA: alarms (alarmas de pánico)
CREATE TABLE IF NOT EXISTS public.alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by TEXT,
  objective_id TEXT REFERENCES public.objectives(id) ON DELETE SET NULL,
  alarm_type TEXT NOT NULL DEFAULT 'panico',
  message TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','acknowledged','resolved')),
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.alarms ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='alarms' AND policyname='open_all_alarms') THEN
    CREATE POLICY "open_all_alarms" ON public.alarms FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 9. TABLA: authorized_users (whitelist)
CREATE TABLE IF NOT EXISTS public.authorized_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'operador',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.authorized_users ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='authorized_users' AND policyname='open_all_au') THEN
    CREATE POLICY "open_all_au" ON public.authorized_users FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 10. TABLA: checkpoints (puntos de control de rondines)
CREATE TABLE IF NOT EXISTS public.checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id TEXT REFERENCES public.objectives(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  qr_code TEXT UNIQUE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='checkpoints' AND policyname='open_all_cp') THEN
    CREATE POLICY "open_all_cp" ON public.checkpoints FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 11. TABLA: patrol_checkpoint_logs
CREATE TABLE IF NOT EXISTS public.patrol_checkpoint_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES public.patrol_rounds(id) ON DELETE CASCADE,
  checkpoint_id UUID REFERENCES public.checkpoints(id) ON DELETE CASCADE,
  operator_id TEXT,
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  photo_url TEXT
);

ALTER TABLE public.patrol_checkpoint_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patrol_checkpoint_logs' AND policyname='open_all_pcl') THEN
    CREATE POLICY "open_all_pcl" ON public.patrol_checkpoint_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 12. TABLA: gps_tracking
CREATE TABLE IF NOT EXISTS public.gps_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id TEXT,
  objective_id UUID,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  battery_level INTEGER,
  shift_id UUID REFERENCES public.guard_shifts(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gps_tracking ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gps_tracking' AND policyname='open_all_gps') THEN
    CREATE POLICY "open_all_gps" ON public.gps_tracking FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 13. TABLA: inventory_items
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  available_quantity INTEGER DEFAULT 0,
  condition TEXT NOT NULL DEFAULT 'operativo',
  objective_id TEXT REFERENCES public.objectives(id) ON DELETE SET NULL,
  serial_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inventory_items' AND policyname='open_all_inv') THEN
    CREATE POLICY "open_all_inv" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 14. TABLA: inventory_handoffs
CREATE TABLE IF NOT EXISTS public.inventory_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES public.guard_shifts(id) ON DELETE SET NULL,
  operator_id TEXT,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'operativo',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.inventory_handoffs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inventory_handoffs' AND policyname='open_all_inh') THEN
    CREATE POLICY "open_all_inh" ON public.inventory_handoffs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 15. TABLA: push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='push_subscriptions' AND policyname='open_all_ps') THEN
    CREATE POLICY "open_all_ps" ON public.push_subscriptions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 16. TABLA: patrol_track_points
CREATE TABLE IF NOT EXISTS public.patrol_track_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.patrol_rounds(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.patrol_track_points ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patrol_track_points' AND policyname='open_all_ptp') THEN
    CREATE POLICY "open_all_ptp" ON public.patrol_track_points FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 17. TABLA: geofence_alerts
CREATE TABLE IF NOT EXISTS public.geofence_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id TEXT,
  objective_id TEXT REFERENCES public.objectives(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL DEFAULT 'exit',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.geofence_alerts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='geofence_alerts' AND policyname='open_all_ga') THEN
    CREATE POLICY "open_all_ga" ON public.geofence_alerts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 18. TABLA: patrol_trace
CREATE TABLE IF NOT EXISTS public.patrol_trace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES public.guard_shifts(id) ON DELETE CASCADE,
  operator_id TEXT,
  objective_id TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.patrol_trace ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patrol_trace' AND policyname='open_all_ptrace') THEN
    CREATE POLICY "open_all_ptrace" ON public.patrol_trace FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 19. TABLA: patrol_rounds_audit
CREATE TABLE IF NOT EXISTS public.patrol_rounds_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES public.patrol_rounds(id) ON DELETE CASCADE,
  operator_id TEXT,
  objective_id TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.patrol_rounds_audit ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patrol_rounds_audit' AND policyname='open_all_pra') THEN
    CREATE POLICY "open_all_pra" ON public.patrol_rounds_audit FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 20. TABLA: contracts (contratos de clientes)
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id TEXT REFERENCES public.objectives(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  monthly_value NUMERIC(12,2),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','cancelled','pending')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contracts' AND policyname='open_all_contracts') THEN
    CREATE POLICY "open_all_contracts" ON public.contracts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 21. TABLA: objective_zones
CREATE TABLE IF NOT EXISTS public.objective_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id TEXT REFERENCES public.objectives(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  zone_type TEXT DEFAULT 'restricted',
  geojson JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.objective_zones ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objective_zones' AND policyname='open_all_oz') THEN
    CREATE POLICY "open_all_oz" ON public.objective_zones FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- PARTE 2: ÍNDICES DE PERFORMANCE
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_resources_status ON public.resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_email ON public.resources(email);
CREATE INDEX IF NOT EXISTS idx_resources_current_objective ON public.resources(current_objective_id);
CREATE INDEX IF NOT EXISTS idx_resources_credential_expiry ON public.resources(credential_expiry);
CREATE INDEX IF NOT EXISTS idx_guard_shifts_operator ON public.guard_shifts(operator_id, checkin_time DESC);
CREATE INDEX IF NOT EXISTS idx_guard_shifts_objective ON public.guard_shifts(objective_id);
CREATE INDEX IF NOT EXISTS idx_guard_book_objective ON public.guard_book_entries(objective_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_operator ON public.gps_tracking(operator_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_patrol_rounds_operator ON public.patrol_rounds(operator_id, round_start DESC);
CREATE INDEX IF NOT EXISTS idx_patrol_tracks_round ON public.patrol_track_points(round_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_authorized_users_email ON public.authorized_users(email);
CREATE INDEX IF NOT EXISTS idx_contracts_objective ON public.contracts(objective_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);

-- ─────────────────────────────────────────────────────────────
-- PARTE 3: FUNCIONES Y VISTAS
-- ─────────────────────────────────────────────────────────────

-- Función geofencing Haversine
CREATE OR REPLACE FUNCTION public.check_geofence(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_objective_id TEXT,
    p_radius_meters DOUBLE PRECISION DEFAULT 200.0
)
RETURNS BOOLEAN AS $$
DECLARE
    v_obj_lat DOUBLE PRECISION;
    v_obj_lng DOUBLE PRECISION;
    v_dist DOUBLE PRECISION;
BEGIN
    SELECT latitude, longitude INTO v_obj_lat, v_obj_lng
    FROM public.objectives WHERE id = p_objective_id;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    v_dist := 6371000 * acos(
        LEAST(1.0, cos(radians(v_obj_lat)) * cos(radians(p_lat)) *
        cos(radians(p_lng) - radians(v_obj_lng)) +
        sin(radians(v_obj_lat)) * sin(radians(p_lat)))
    );
    RETURN v_dist <= p_radius_meters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario es gerente
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'gerente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vista de resumen de planillas
CREATE OR REPLACE VIEW public.payroll_summary AS
SELECT
  gs.operator_id,
  r.name AS operator_name,
  o.name AS objective_name,
  DATE(gs.checkin_time AT TIME ZONE 'America/Argentina/Buenos_Aires') AS work_date,
  gs.checkin_time,
  gs.checkout_time,
  gs.duration_minutes,
  gs.overtime_minutes,
  gs.status
FROM public.guard_shifts gs
LEFT JOIN public.resources r ON r.id = gs.operator_id
LEFT JOIN public.objectives o ON o.id = gs.objective_id;

-- ─────────────────────────────────────────────────────────────
-- PARTE 4: STORAGE BUCKETS
-- ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'novedades-media', 'novedades-media', true, 10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','audio/mpeg','audio/wav','audio/ogg','audio/mp4','audio/webm']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true, 5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 'documents', false, 20971520,
  ARRAY['application/pdf','image/jpeg','image/png']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='novedades_media_public_read' AND schemaname='storage') THEN
    CREATE POLICY "novedades_media_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'novedades-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='storage_all_access' AND schemaname='storage') THEN
    CREATE POLICY "storage_all_access" ON storage.objects FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- PARTE 5: REALTIME
-- ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='resources') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.resources;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='objectives') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.objectives;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='guard_shifts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guard_shifts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='alarms') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alarms;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='guard_book_entries') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guard_book_entries;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- PARTE 6: DATOS SEMILLA (datos demo iniciales)
-- ─────────────────────────────────────────────────────────────

-- Objetivos de ejemplo
INSERT INTO public.objectives (id, name, address, client_name, contact_phone, latitude, longitude, is_active, hourly_billing_rate)
VALUES
  ('OBJ-001', 'Supermercado Norte', 'Av. Rivadavia 1200, Santa Fe', 'Carrefour S.A.', '+54 342 555-1001', -31.6107, -60.6973, true, 4500.00),
  ('OBJ-002', 'Banco Centro', 'San Martín 456, Santa Fe', 'BBVA Argentina', '+54 342 555-1002', -31.6235, -60.7120, true, 5500.00),
  ('OBJ-003', 'Planta Industrial Sur', 'Ruta 1 km 15, Santa Fe', 'ARCOR S.A.', '+54 342 555-1003', -31.6890, -60.7000, true, 4800.00)
ON CONFLICT (id) DO NOTHING;

-- Personal de seguridad de ejemplo
INSERT INTO public.resources (id, name, role, status, phone, email, hiring_date, salary, hourly_pay_rate, current_objective_id)
VALUES
  ('S-701', 'Carlos Méndez', 'Vigilante Principal', 'activo', '+54 342 555-0123', 'c.mendez@empresa.com', '2024-01-12', '$840.000', 3200.00, 'OBJ-001'),
  ('S-702', 'Marta Ruiz', 'Supervisora de Zona', 'activo', '+54 342 555-0124', 'm.ruiz@empresa.com', '2023-11-20', '$920.000', 3800.00, 'OBJ-002'),
  ('S-703', 'Diego López', 'Vigilante', 'disponible', '+54 342 555-0125', 'd.lopez@empresa.com', '2024-03-05', '$780.000', 3000.00, NULL),
  ('S-704', 'Ana García', 'Jefa de Turno', 'activo', '+54 342 555-0126', 'a.garcia@empresa.com', '2023-07-15', '$960.000', 4000.00, 'OBJ-003')
ON CONFLICT (id) DO NOTHING;

-- Usuario gerente autorizado
INSERT INTO public.authorized_users (email, role, status, notes)
VALUES
  ('nespinosa.oimpa@gmail.com', 'gerente', 'approved', 'Gerente General — autorizado por administrador del sistema'),
  ('jugador.nico55@gmail.com', 'gerente', 'approved', 'Cuenta de desarrollo'),
  ('admin@sigessecurity.com', 'gerente', 'approved', 'Cuenta administrativa principal')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

-- Contrato de ejemplo
INSERT INTO public.contracts (objective_id, client_name, start_date, end_date, monthly_value, status)
VALUES
  ('OBJ-001', 'Carrefour S.A.', '2024-01-01', '2026-12-31', 285000.00, 'active'),
  ('OBJ-002', 'BBVA Argentina', '2024-03-01', '2027-02-28', 380000.00, 'active'),
  ('OBJ-003', 'ARCOR S.A.', '2024-06-01', '2026-05-31', 320000.00, 'active')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- PARTE 7: NOTIFICAR POSTGREST
-- ─────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- ✅ SCRIPT COMPLETADO
-- Tablas creadas: resources, objectives, users, profiles,
--   guard_shifts, guard_book_entries, patrol_rounds,
--   patrol_track_points, patrol_trace, patrol_checkpoint_logs,
--   checkpoints, gps_tracking, alarms, geofence_alerts,
--   inventory_items, inventory_handoffs, push_subscriptions,
--   authorized_users, contracts, objective_zones,
--   patrol_rounds_audit
-- ============================================================
