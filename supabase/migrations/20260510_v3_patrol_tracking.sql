-- ============================================================
-- Migración v3.0: Trazabilidad de Rondines (Fase 4)
-- ============================================================

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

-- Limpieza automática de puntos de más de 7 días
-- Usamos una función de DB que se puede llamar o programar
CREATE OR REPLACE FUNCTION cleanup_old_patrol_tracks()
RETURNS void AS $$
BEGIN
  DELETE FROM public.patrol_track_points
  WHERE recorded_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql;

-- Notificar a PostgREST
NOTIFY pgrst, 'reload schema';
