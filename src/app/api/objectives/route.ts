import { isConfigured } from '@/lib/supabase';
import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { serverCache } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    if (!isConfigured) {
      // Mock data for local testing without Supabase keys
      return NextResponse.json([
        { id: 'OBJ-001', name: 'Puerto SIGPAD', address: 'Dique 1, Puerto SIGPAD', latitude: -31.6450, longitude: -60.6950, status: 'Activo', is_active: true },
        { id: 'OBJ-002', name: 'Consorcio Portofino', address: 'Costanera Este', latitude: -31.6280, longitude: -60.6750, status: 'Activo', is_active: true },
        { id: 'OBJ-003', name: 'Planta Industrial', address: 'Sauce Viejo', latitude: -31.7200, longitude: -60.7800, status: 'Alerta', is_active: true },
      ]);
    }

    const userCookie = req.cookies.get('SIGPAD_user');
    if (!userCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let tenantId: string | null = null;
    let isSuper = false;

    try {
      const user = JSON.parse(decodeURIComponent(userCookie.value));
      tenantId = user?.tenant_id || user?.user_metadata?.tenant_id;
      isSuper = user?.role === 'superadmin' || user?.user_metadata?.role === 'superadmin';
    } catch {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    if (!tenantId && !isSuper) {
      return NextResponse.json({ error: 'Inquilino no especificado' }, { status: 400 });
    }

    // 🚀 CACHE CHECK: Prevent DB hit if requested within 5 seconds
    const cacheKey = `objectives-${isSuper ? 'super' : tenantId}`;
    const cachedData = serverCache.get(cacheKey, 5000); // 5 seconds TTL
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=5'
        }
      });
    }

    const supabase = createServiceClient();
    let query = supabase
      .from('objectives')
      .select('*')
      .eq('is_active', true);

    if (!isSuper && tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.order('name');

    if (error) throw error;

    // Save to serverCache
    serverCache.set(cacheKey, data);

    return NextResponse.json(data, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'no-store, max-age=0, must-revalidate'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isConfigured) {
      return NextResponse.json({ id: 'mock-post-id', name: 'Mock Objective' });
    }

    const userCookie = req.cookies.get('SIGPAD_user');
    if (!userCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let tenantId: string | null = null;
    let isSuper = false;

    try {
      const user = JSON.parse(decodeURIComponent(userCookie.value));
      tenantId = user?.tenant_id || user?.user_metadata?.tenant_id;
      isSuper = user?.role === 'superadmin' || user?.user_metadata?.role === 'superadmin';
    } catch {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    const body = await req.json();

    // Enforce tenant_id injection. Non-superadmins must use their own tenantId.
    const targetTenantId = isSuper ? (body.tenant_id || tenantId) : tenantId;

    if (!targetTenantId) {
      return NextResponse.json({ error: 'tenant_id es requerido' }, { status: 400 });
    }

    // Explicitly map only existing physical columns to prevent schema cache mismatches
    const payload = {
      name: body.name,
      address: body.address,
      client_name: body.client_name,
      contact_phone: body.contact_phone,
      latitude: parseFloat(body.latitude),
      longitude: parseFloat(body.longitude),
      geofence_radius: body.geofence_radius ? parseFloat(body.geofence_radius) : 200,
      hourly_billing_rate: body.hourly_billing_rate ? parseFloat(body.hourly_billing_rate) : null,
      is_active: true,
      tenant_id: targetTenantId
    };

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('objectives')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    // 🚀 CACHE INVALIDATION: Clean cached objectives & map for this tenant
    serverCache.invalidate(`objectives-${targetTenantId}`);
    serverCache.invalidate(`dashboard-map-${targetTenantId}`);
    serverCache.invalidate(`objectives-super`);
    serverCache.invalidate(`dashboard-map-super`);

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
