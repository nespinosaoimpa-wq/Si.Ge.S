import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { frozen_by, reason, latitude, longitude, radius, hours } = await request.json();
    const supabase = createClient();

    // Call the RPC function defined in the SQL schema
    const { data, error } = await supabase.rpc('freeze_logs', {
      p_frozen_by: frozen_by,
      p_reason: reason,
      p_lat: latitude,
      p_lng: longitude,
      p_radius: radius || 2000,
      p_hours: hours || 2
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ freeze_id: data });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
