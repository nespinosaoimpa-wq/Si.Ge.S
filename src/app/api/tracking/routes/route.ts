import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('operator_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!userId || !from || !to) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch shifts for the user in the date range that have a patrol_route
    // We use ST_AsGeoJSON to get the PostGIS geometry as GeoJSON
    const { data, error } = await supabase
      .from('guard_shifts')
      .select('id, checkin_time, checkout_time, patrol_route_geojson:patrol_route')
      .eq('operator_id', userId)
      .gte('checkin_time', from)
      .lte('checkin_time', to)
      .not('patrol_route', 'is', null);

    if (error) throw error;

    // Convert the result to a FeatureCollection
    const features = data.map(shift => ({
      type: 'Feature',
      id: shift.id,
      properties: {
        checkin_time: shift.checkin_time,
        checkout_time: shift.checkout_time,
      },
      geometry: typeof shift.patrol_route_geojson === 'string' 
        ? JSON.parse(shift.patrol_route_geojson) 
        : shift.patrol_route_geojson
    }));

    return NextResponse.json({
      type: 'FeatureCollection',
      features
    });
  } catch (error: any) {
    console.error("Routes API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
