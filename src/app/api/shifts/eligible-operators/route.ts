import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startTime = searchParams.get('start_time');
    const endTime = searchParams.get('end_time');
    const minRestHoursStr = searchParams.get('min_rest_hours');
    const minRestHours = minRestHoursStr ? parseInt(minRestHoursStr) : 12;

    if (!startTime || !endTime) {
      return NextResponse.json({ error: 'Faltan parámetros de inicio o fin de cobertura' }, { status: 400 });
    }

    const supabase = createServiceClient();
    
    // Call the Postgres RPC function we created
    const { data: eligibleOperators, error } = await supabase
      .rpc('get_eligible_operators', {
        p_start_time: startTime,
        p_end_time: endTime,
        p_min_rest_hours: minRestHours
      });

    if (error) throw error;

    return NextResponse.json({ eligibleOperators });
  } catch (error: any) {
    console.error('[ELIGIBLE_OPERATORS_GET]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
