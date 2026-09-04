import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantFromRequest } from '@/lib/resolve-tenant';

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveTenantFromRequest(request);
    const tenantId = ctx?.tenantId || null;
    const isSuper = ctx?.isSuper || false;

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
      let query = supabase
        .from('patrol_trace')
        .select('latitude, longitude, created_at')
        .eq('round_id', roundId);

      if (!isSuper && tenantId) {
        query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      const { data, error } = await query.order('created_at', { ascending: true });
      
      if (error) throw error;
      return NextResponse.json(data || []);
    }

    // General GPS logs
    let query = supabase
      .from('gps_tracking')
      .select('latitude, longitude, recorded_at')
      .eq('operator_id', userId)
      .gte('recorded_at', from)
      .lte('recorded_at', to);

    if (!isSuper && tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    }

    const { data, error } = await query.order('recorded_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("Tracking History Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
