-- ============================================================
-- TAREA 2: Geocodificación Inversa Táctica (PostGIS)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Tabla de zonas internas por objetivo
CREATE TABLE IF NOT EXISTS public.objective_zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID REFERENCES public.objectives(id) ON DELETE CASCADE,
  zone_name   TEXT NOT NULL,
  description TEXT,
  geom        GEOMETRY(POLYGON, 4326) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índice espacial obligatorio
CREATE INDEX IF NOT EXISTS idx_objective_zones_geom
  ON public.objective_zones USING GIST (geom);

-- RLS básico
ALTER TABLE public.objective_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gerente_full_access_zones" ON public.objective_zones
  FOR ALL USING (true) WITH CHECK (true);

-- 2. Función de geocodificación inversa táctica
-- Recibe lat/lng → devuelve zone_name del polígono que contiene el punto
-- Fallback: 'Perímetro General'
CREATE OR REPLACE FUNCTION get_zone_name(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_objective_id UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_zone TEXT;
  v_point GEOMETRY;
BEGIN
  -- Construir el punto desde lat/lng
  v_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);

  -- Buscar qué zona contiene el punto
  -- Si se provee objective_id, limitar la búsqueda a ese objetivo
  SELECT zone_name
  INTO   v_zone
  FROM   public.objective_zones
  WHERE  ST_Contains(geom, v_point)
    AND  (p_objective_id IS NULL OR objective_id = p_objective_id)
  ORDER BY ST_Area(geom) ASC  -- Zona más pequeña (más precisa) primero
  LIMIT 1;

  RETURN COALESCE(v_zone, 'Perímetro General');
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Vista de prueba (verificar que funcione)
-- SELECT get_zone_name(-31.6350, -60.7000, NULL);
