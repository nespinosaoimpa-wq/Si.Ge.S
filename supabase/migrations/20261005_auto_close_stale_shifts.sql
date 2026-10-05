-- ==============================================================================
-- MIGRATION: 20261005_auto_close_stale_shifts.sql
-- DESCRIPCIÓN: Función almacenada e índice para cerrar de forma limpia turnos huérfanos (>16h)
--              Garantiza la higiene de datos para el lanzamiento comercial.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.auto_close_stale_shifts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    closed_count integer := 0;
BEGIN
    WITH stale AS (
        UPDATE public.guard_shifts
        SET 
            checkout_time = checkin_time + INTERVAL '8 hours',
            status = 'completado',
            duration_minutes = 480,
            gross_duration_minutes = 480,
            total_hours = 8,
            abandoned_minutes = 0
        WHERE status IN ('activo', 'active')
          AND checkout_time IS NULL
          AND checkin_time < NOW() - INTERVAL '16 hours'
        RETURNING id, operator_id
    )
    SELECT COUNT(*) INTO closed_count FROM stale;

    -- Actualizar recursos asociados que hayan quedado con estado 'activo' sin turno vigente
    UPDATE public.resources r
    SET status = 'disponible', current_shift_id = NULL
    WHERE r.status = 'activo'
      AND NOT EXISTS (
          SELECT 1 FROM public.guard_shifts s
          WHERE s.operator_id = r.id
            AND s.status IN ('activo', 'active')
            AND s.checkout_time IS NULL
      );

    RETURN closed_count;
END;
$$;
