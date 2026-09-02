-- ==============================================================================
-- SIGPAD — SQL AUTOMATED MAINTENANCE & DATA CLEANUP (pg_cron)
-- Ejecutar en el Editor SQL de Supabase para activar mantenimiento de fondo.
-- ==============================================================================

-- 1. Habilitar extensión pg_cron si está disponible en la instancia
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Función de Limpieza de Cementerio de Datos
CREATE OR REPLACE FUNCTION public.sigpad_auto_data_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- A. Purgar puntos GPS antiguos de más de 60 días
  DELETE FROM public.gps_tracking
  WHERE recorded_at < (NOW() - INTERVAL '60 days');

  -- B. Purgar alertas resueltas añejas de más de 90 días
  DELETE FROM public.alarms
  WHERE status IN ('resolved', 'resuelto', 'acknowledged')
    AND created_at < (NOW() - INTERVAL '90 days');

  -- C. Purgar notificaciones del sistema leídas de más de 30 días
  DELETE FROM public.system_notifications
  WHERE is_read = TRUE
    AND created_at < (NOW() - INTERVAL '30 days');

  -- D. Limpiar tokens expirados o sesiones inactivas añejas (si aplica)
  -- Nota: Los registros contables (guard_shifts) y el Libro de Guardia (guard_book_entries)
  -- se preservan al 100% para auditoría e inspección.
END;
$$;

-- 3. Programar la tarea de fondo para ejecutarse todas las noches a las 03:00 AM UTC
SELECT cron.schedule(
  'sigpad-nightly-cleanup',
  '0 3 * * *',
  'SELECT public.sigpad_auto_data_cleanup();'
);
