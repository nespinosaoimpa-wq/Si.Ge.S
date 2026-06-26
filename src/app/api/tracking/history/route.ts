import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('round_id');
    const userId = searchParams.get('user_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!roundId && (!userId || !from || !to)) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabase = createServiceClient();

    if (roundId) {
      // High resolution patrol-specific points from patrol_trace
      const { data, error } = await supabase
        .from('patrol_trace')
        .select('latitude, longitude, created_at')
        .eq('round_id', roundId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      // Map created_at to recorded_at for frontend compatibility if needed, or just return as is
      return NextResponse.json(data || []);
    }

    // General GPS logs
    const { data, error } = await supabase
      .from('gps_tracking')
      .select('latitude, longitude, recorded_at')
      .eq('operator_id', userId)
      .gte('recorded_at', from)
      .lte('recorded_at', to)
      .order('recorded_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("Tracking History Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
