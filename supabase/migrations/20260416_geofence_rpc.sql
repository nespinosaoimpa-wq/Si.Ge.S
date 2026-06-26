-- SQL Function for Geofencing
-- Calculates Haversine distance and checks if point is within radius
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
    -- Get objective coordinates
    SELECT latitude, longitude INTO v_obj_lat, v_obj_lng
    FROM public.objectives
    WHERE id = p_objective_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Haversine formula
    v_dist := 6371000 * acos(
        cos(radians(v_obj_lat)) * cos(radians(p_lat)) * 
        cos(radians(p_lng) - radians(v_obj_lng)) + 
        sin(radians(v_obj_lat)) * sin(radians(p_lat))
    );

    RETURN v_dist <= p_radius_meters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
