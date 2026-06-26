import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { operator_id, route_id, checkpoint_id, latitude, longitude, shift_id } = await request.json();
    const supabase = createClient();

    // 1. Verify Geofence for this specific checkpoint
    const { data: isWithinGeofence, error: geoError } = await supabase.rpc('check_geofence', {
      p_lat: latitude,
      p_lng: longitude,
      p_objective_id: checkpoint_id // Checkpoints are used as target objectives for the geofence function
    });

    if (geoError) throw geoError;

    // 2. Register the patrol log
    const { data, error } = await supabase
      .from('patrol_logs')
      .insert({
        operator_id,
        route_id,
        checkpoint_id,
        shift_id,
        latitude,
        longitude,
        within_geofence: isWithinGeofence,
        status: isWithinGeofence ? 'sin_novedad' : 'con_novedad',
        registered_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      log: data,
      warning: !isWithinGeofence ? 'Punto registrado fuera de geocerca' : null
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
