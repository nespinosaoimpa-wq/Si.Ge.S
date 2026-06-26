-- Phase 4: Alertas de Abandono de Puesto (Exit Geofencing)

-- 1. Table for geofence breach events (Auditoria)
CREATE TABLE IF NOT EXISTS public.geofence_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID REFERENCES public.guard_shifts(id) ON DELETE CASCADE,
    operator_id TEXT,
    objective_id UUID REFERENCES public.objectives(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL, -- 'exit' or 'entry'
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add status columns to guard_shifts for real-time monitoring
ALTER TABLE public.guard_shifts
ADD COLUMN IF NOT EXISTS geofence_status TEXT DEFAULT 'inside', -- 'inside', 'outside', 'abandoned'
ADD COLUMN IF NOT EXISTS last_exit_at TIMESTAMP WITH TIME ZONE;

-- 3. Function to log geofence alerts and update shift status
CREATE OR REPLACE FUNCTION public.log_geofence_alert(
    p_shift_id UUID,
    p_operator_id TEXT,
    p_objective_id UUID,
    p_type TEXT,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_dist DOUBLE PRECISION
)
RETURNS VOID AS $$
BEGIN
    -- Insert into logs
    INSERT INTO public.geofence_alerts (shift_id, operator_id, objective_id, alert_type, latitude, longitude, distance_meters)
    VALUES (p_shift_id, p_operator_id, p_objective_id, p_type, p_lat, p_lng, p_dist);

    -- Update shift record
    UPDATE public.guard_shifts
    SET 
        geofence_status = CASE WHEN p_type = 'exit' THEN 'abandoned' ELSE 'inside' END,
        last_exit_at = CASE WHEN p_type = 'exit' THEN NOW() ELSE NULL END
    WHERE id = p_shift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
