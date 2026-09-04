import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantFromRequest } from '@/lib/resolve-tenant';

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveTenantFromRequest(request);
    const tenantId = ctx?.tenantId || null;
    const isSuper = ctx?.isSuper || false;

    const supabase = createServiceClient();

    let query = supabase
      .from('cameras')
      .select('*')
      .eq('status', 'activa');

    if (!isSuper && tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    }

    const { data: cameras, error } = await query;

    if (error) throw error;

    return NextResponse.json(cameras || []);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { latitude, longitude, radius } = await request.json();
    const supabase = createServiceClient();

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
