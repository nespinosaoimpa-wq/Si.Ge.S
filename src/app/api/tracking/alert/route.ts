import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { shift_id, operator_id, objective_id, type, latitude, longitude, distance } = await request.json();

    const supabase = createServiceClient();

    // 1. Log the alert in geofence_alerts and update shift status
    await supabase.rpc('log_geofence_alert', {
      p_shift_id: shift_id,
      p_operator_id: operator_id,
      p_objective_id: objective_id,
      p_type: type,
      p_lat: latitude || 0,
      p_lng: longitude || 0,
      p_dist: distance || 0
    });

    // 2. Incident Persistence (Phase Final)
    if (type === 'exit') {
      await supabase.from('geofencing_incidents').insert({
        shift_id,
        operator_id,
        objective_id,
        exit_at: new Date().toISOString(),
        max_distance_meters: distance,
        status: 'pendiente'
      });
    } else if (type === 'entry') {
      // Find the last open incident for this shift
      const { data: lastIncident } = await supabase
        .from('geofencing_incidents')
        .select('*')
        .eq('shift_id', shift_id)
        .is('return_at', null)
        .order('exit_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastIncident) {
        // Generate Static Map Snapshot
        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
        let mapUrl: string | null = null;
        
        if (mapboxToken && latitude && longitude) {
           // Create a static map showing the objective (blue) and the exit point (red)
           // We'll fetch the objective coords if not provided
           const { data: obj } = await supabase.from('objectives').select('latitude, longitude').eq('id', objective_id).maybeSingle();
           
           if (obj) {
             const markers = `pin-s-home+2563eb(${obj.longitude},${obj.latitude}),pin-s-alert+ef4444(${longitude},${latitude})`;
             mapUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${markers}/auto/600x400?access_token=${mapboxToken}`;
           }
        }

        await supabase
          .from('geofencing_incidents')
          .update({
            return_at: new Date().toISOString(),
            max_distance_meters: Math.max(lastIncident.max_distance_meters, distance || 0),
            map_snapshot_url: mapUrl
          })
          .eq('id', lastIncident.id);
      }
    }

    // 3. Insert into guard_book_entries for auditing
    await supabase.from('guard_book_entries').insert({
      objective_id: objective_id,
      operator_id: operator_id,
      entry_type: type === 'exit' ? 'alerta' : 'novedad',
      content: type === 'exit' 
        ? `⚠️ ALERTA DE ABANDONO: El operador se alejó ${Math.round(distance)}m del objetivo.`
        : `✅ REINGRESO AL PUESTO: El operador ha regresado a la zona autorizada.`,
      latitude: latitude || 0,
      longitude: longitude || 0,
      urgency: type === 'exit' ? 'critica' : 'normal'
    });

    // 3. Optional: Trigger Push Notification to Supervisor
    // For now, the Realtime update to guard_shifts.geofence_status will notify the manager map
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[GEOTRACKING_ALERT]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
