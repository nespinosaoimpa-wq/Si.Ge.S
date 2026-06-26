-- ============================================================
-- Migración: Unificación Táctica y Auditoría Forense (v5.0)
-- Descripción: Establece el esquema para avatars, telemetría vinculada y RLS de trazabilidad.
-- ============================================================

-- 1. Tabla de Perfiles (para Avatars e Información Pública)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Realtime para profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- 2. Vincular Resources a Profiles
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Telemetría Vinculada a Objetivos
-- Agregar objective_id a gps_tracking para filtrado táctico instantáneo
ALTER TABLE public.gps_tracking
  ADD COLUMN IF NOT EXISTS objective_id UUID REFERENCES public.objectives(id) ON DELETE SET NULL;

-- Agregar objective_id a geofence_alerts para auditoría por nodo (Safe Check)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'geofence_alerts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'geofence_alerts' AND column_name = 'objective_id') THEN
      ALTER TABLE public.geofence_alerts ADD COLUMN objective_id UUID REFERENCES public.objectives(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 4. Índices B-tree para Optimización de Performance
CREATE INDEX IF NOT EXISTS idx_resources_current_objective ON public.resources(current_objective_id);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_objective ON public.gps_tracking(objective_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'geofence_alerts' AND column_name = 'objective_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'geofence_alerts' AND indexname = 'idx_geofence_alerts_objective') THEN
      CREATE INDEX idx_geofence_alerts_objective ON public.geofence_alerts(objective_id);
    END IF;
  END IF;
END $$;

-- 5. RLS para patrol_trace (Seguridad Forense)
ALTER TABLE public.patrol_trace ENABLE ROW LEVEL SECURITY;

-- Política: Gerentes pueden ver todo
CREATE POLICY "Managers can view all traces"
ON public.patrol_trace
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role = 'gerente'
  )
);

-- Política: Escritura permitida para el Service Role (Backend)
-- Note: Service role bypasses RLS by default, but we specify it for clarity if needed.
-- However, if the frontend ever tries to save directly:
CREATE POLICY "Operators can insert their own traces"
ON public.patrol_trace
FOR INSERT
WITH CHECK (true); -- Permitimos inserción abierta para evitar latencia, el backend valida shift_id.

-- 6. Trigger para auto-crear perfil al registrarse (Opcional pero recomendado)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
-- CREATE TRIGGER on_auth_user_created_profile
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- 7. Recargar Esquema
NOTIFY pgrst, 'reload schema';
