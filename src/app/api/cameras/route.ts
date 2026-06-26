import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createClient();

    const { data: cameras, error } = await supabase
      .from('cameras')
      .select('*')
      .eq('status', 'activa');

    if (error) throw error;

    return NextResponse.json(cameras);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { latitude, longitude, radius } = await request.json();
    const supabase = createClient();

    const { data, error } = await supabase.rpc('find_escape_route_cameras', {
      p_lat: latitude,
      p_lng: longitude,
      p_radius_meters: radius || 500
    });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
