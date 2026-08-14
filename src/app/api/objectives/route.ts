import { isConfigured } from '@/lib/supabase';
import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { invalidarCache, serverCache } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    if (!isConfigured) {
      return NextResponse.json([
        { id: 'OBJ-001', name: 'Puerto SIGPAD', address: 'Dique 1, Puerto SIGPAD', latitude: -31.6450, longitude: -60.6950, status: 'Activo', is_active: true },
        { id: 'OBJ-002', name: 'Consorcio Portofino', address: 'Costanera Este', latitude: -31.6280, longitude: -60.6750, status: 'Activo', is_active: true },
        { id: 'OBJ-003', name: 'Planta Industrial', address: 'Sauce Viejo', latitude: -31.7200, longitude: -60.7800, status: 'Alerta', is_active: true },
      ]);
    }

    let tenantId: string | null = null;
    let isSuper = false;
    let userId: string | null = null;

    const userCookie = req.cookies.get('SIGPAD_user');
    if (userCookie) {
      try {
        const user = JSON.parse(decodeURIComponent(userCookie.value));
        userId = user?.id;
        tenantId = user?.tenant_id || user?.user_metadata?.tenant_id;
        isSuper = user?.role === 'superadmin' || user?.user_metadata?.role === 'superadmin' || user?.role === 'gerente';
      } catch (e) {
        console.warn('[GET_OBJECTIVES] Cookie parse warning:', e);
      }
    }

    if (!tenantId && !isSuper && userId) {
      try {
        const supabase = createServiceClient();
        const { data: dbUser } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', userId)
          .maybeSingle();
        if (dbUser?.tenant_id) {
          tenantId = dbUser.tenant_id;
        }
      } catch {}
    }

    try {
      const supabase = createServiceClient();
      let query = supabase
        .from('objectives')
        .select('*')
        .eq('is_active', true);

      if (!isSuper && tenantId) {
        query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null,tenant_id.eq.a1b2c3d4-0001-0001-0001-000000000001`);
      }

      const { data, error } = await query.order('name');
      if (error) throw error;

      return NextResponse.json(data || [], {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=30'
        }
      });
    } catch (dbErr: any) {
      console.warn('[GET_OBJECTIVES] Fallback mode active:', dbErr?.message);
      return NextResponse.json([
        { id: 'OBJ-001', name: 'Puerto SIGPAD', address: 'Dique 1, Puerto SIGPAD', latitude: -31.6450, longitude: -60.6950, status: 'Activo', is_active: true },
        { id: 'OBJ-002', name: 'Consorcio Portofino', address: 'Costanera Este', latitude: -31.6280, longitude: -60.6750, status: 'Activo', is_active: true },
      ]);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let tenantId: string | null = null;
    let isSuper = false;
    let userId: string | null = null;

    const userCookie = req.cookies.get('SIGPAD_user');
    if (userCookie) {
      try {
        const user = JSON.parse(decodeURIComponent(userCookie.value));
        userId = user?.id;
        tenantId = user?.tenant_id || user?.user_metadata?.tenant_id;
        isSuper = user?.role === 'superadmin' || user?.user_metadata?.role === 'superadmin' || user?.role === 'gerente';
      } catch (e) {
        console.warn('[POST_OBJECTIVE] Cookie parse warning:', e);
      }
    }

    if (!tenantId && !isSuper && userId) {
      try {
        const supabase = createServiceClient();
        const { data: dbUser } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', userId)
          .maybeSingle();
        if (dbUser?.tenant_id) {
          tenantId = dbUser.tenant_id;
        }
      } catch {}
    }

    const body = await req.json().catch(() => ({}));

    const isValidUUID = (uuid: any) => {
      if (typeof uuid !== 'string') return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
    };

    let targetTenantId = isSuper ? (body.tenant_id || tenantId) : tenantId;

    if (targetTenantId && !isValidUUID(targetTenantId)) {
      targetTenantId = null;
    }

    if (!targetTenantId) {
      try {
        const supabaseAdmin = createServiceClient();
        const { data: firstTenant } = await supabaseAdmin
          .from('tenants')
          .select('id')
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        targetTenantId = firstTenant?.id || null;
      } catch {
        targetTenantId = null;
      }
    } else {
      try {
        const supabaseAdmin = createServiceClient();
        const { data: tenantExists } = await supabaseAdmin
          .from('tenants')
          .select('id')
          .eq('id', targetTenantId)
          .maybeSingle();
        
        if (!tenantExists) {
          const { data: fallbackTenant } = await supabaseAdmin
            .from('tenants')
            .select('id')
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          targetTenantId = fallbackTenant?.id || null;
        }
      } catch {
        targetTenantId = null;
      }
    }

    const parseCoord = (val: any, fallback: number) => {
      if (val === null || val === undefined || val === '') return fallback;
      const str = String(val).trim().replace(',', '.');
      const num = parseFloat(str);
      return isNaN(num) ? fallback : num;
    };

    const payload = {
      id: body.id || `OBJ-${Math.floor(Math.random() * 90000) + 10000}`,
      name: body.name || 'Nuevo Objetivo',
      address: body.address || 'Sin dirección registrada',
      client_name: body.client_name || 'Cliente Particular',
      contact_phone: body.contact_phone || null,
      latitude: parseCoord(body.latitude, -31.6107),
      longitude: parseCoord(body.longitude, -60.6973),
      geofence_radius: parseCoord(body.geofence_radius, 200),
      hourly_billing_rate: body.hourly_billing_rate ? parseCoord(body.hourly_billing_rate, 0) : null,
      is_active: true,
      tenant_id: targetTenantId
    };

    try {
      const supabase = createServiceClient();
      let { data, error } = await supabase
        .from('objectives')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.warn('[POST_OBJECTIVE] Supabase insert failed, attempting fallback to tenant_id = null:', error.message);
        const retryPayload = { ...payload, tenant_id: null };
        const { data: retryData, error: retryError } = await supabase
          .from('objectives')
          .insert([retryPayload])
          .select()
          .single();

        if (retryError) {
          console.error('[POST_OBJECTIVE] Retry with tenant_id: null failed:', retryError.message);
          return NextResponse.json({ error: `Error de base de datos: ${retryError.message}` }, { status: 500 });
        }
        data = retryData;
      }

      invalidarCache('objectives');
      serverCache.invalidatePattern('dashboard-map');
      return NextResponse.json(data);
    } catch (dbError: any) {
      console.error('[POST_OBJECTIVE] Supabase execution exception:', dbError?.message);
      return NextResponse.json({ error: `Excepción de base de datos: ${dbError?.message}` }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[POST_OBJECTIVE_ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Error al procesar objetivo' }, { status: 500 });
  }
}
