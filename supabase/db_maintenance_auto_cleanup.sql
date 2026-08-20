-- ==============================================================================
-- SIGPAD — SCRIPT DE LIBERACIÓN DE ESPACIO DE ALMACENAMIENTO (SUPABASE 10GB FREE TIER)
-- Ejecutá este script en el SQL Editor de Supabase para liberar espacio inmediatamente
-- y activar la limpieza automática periódica.
-- ==============================================================================

-- 1. LIMPIEZA INMEDIATA DE HISTORIAL DE RASTREO Y TELEMETRÍA PESADA
-- Mantiene solo los últimos 7 días de puntos GPS y elimina el acumulado histórico.
DELETE FROM public.gps_tracking 
WHERE recorded_at < NOW() - INTERVAL '7 days';

DELETE FROM public.tracking_logs 
WHERE recorded_at < NOW() - INTERVAL '7 days';

DELETE FROM public.patrol_track_points 
WHERE recorded_at < NOW() - INTERVAL '7 days';

-- Si existe la tabla residual resource_locations:
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resource_locations') THEN
        DELETE FROM public.resource_locations WHERE recorded_at < NOW() - INTERVAL '7 days';
    END IF;
END $$;

-- 2. FUNCIÓN DE AUTO-PURGA PERIÓDICA (AUTOMÁTICA)
-- Corre automáticamente en Supabase cada vez que se ejecute o vía cron
CREATE OR REPLACE FUNCTION public.sigpad_auto_purge_telemetry()
RETURNS void AS $$
BEGIN
    -- Mantener 7 días de historial GPS activo de rastreo
    DELETE FROM public.gps_tracking WHERE recorded_at < NOW() - INTERVAL '7 days';
    DELETE FROM public.tracking_logs WHERE recorded_at < NOW() - INTERVAL '7 days';
    DELETE FROM public.patrol_track_points WHERE recorded_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. VACUUM RECLAIM
-- Reclama el espacio libre en disco devuelto por PostgreSQL
VACUUM ANALYZE public.gps_tracking;
VACUUM ANALYZE public.tracking_logs;
VACUUM ANALYZE public.patrol_track_points;
