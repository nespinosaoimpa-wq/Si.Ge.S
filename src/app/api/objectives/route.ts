import { isConfigured } from '@/lib/supabase';
import { createServiceClient, hasAdminAccess } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { invalidarCache, serverCache } from '@/lib/cache';
import { resolveTenantFromRequest, MASTER_TENANT_ID, isValidUUID } from '@/lib/resolve-tenant';

// ──────────────────────────────────────────────────────────────────────────────
// SIGPAD — API Route: /api/objectives
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    if (!isConfigured) {
      return NextResponse.json({ error: 'Service Unavailable' }, { status: 503 });
    }

    const ctx = await resolveTenantFromRequest(req);
    if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { tenantId, isSuper } = ctx;

    if (!isSuper && !tenantId) {
      return NextResponse.json([], {
        headers: { 'X-Tenant-Missing': 'true' }
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

    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveTenantFromRequest(req);
    if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { tenantId, isSuper } = ctx;

    if (!isSuper && !tenantId) {
      return NextResponse.json(
        { error: 'No se puede crear el objetivo: tu sesión no tiene empresa asignada. Cerrá sesión e ingresá nuevamente.' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));

    // Determinar tenant_id final respetando SIEMPRE el tenantId de la sesión del usuario
    let targetTenantId = (body.tenant_id && isValidUUID(body.tenant_id)) ? body.tenant_id : tenantId;

    const parseCoord = (val: any, fallback: number) => {
      if (val === null || val === undefined || val === '') return fallback;
      const str = String(val).trim().replace(',', '.');
      const num = parseFloat(str);
      return isNaN(num) ? fallback : num;
    };

    const payload: any = {
      name: body.name || 'Nuevo Objetivo',
      address: body.address || 'Sin dirección registrada',
      client_name: body.client_name || 'Cliente Particular',
      contact_phone: body.contact_phone || null,
      latitude: parseCoord(body.latitude, -31.6107),
      longitude: parseCoord(body.longitude, -60.6973),
      geofence_radius: parseCoord(body.geofence_radius, 200),
      hourly_billing_rate: body.hourly_billing_rate ? parseCoord(body.hourly_billing_rate, 0) : null,
      is_active: true,
      tenant_id: targetTenantId,
    };

    if (body.id && isValidUUID(body.id)) {
      payload.id = body.id;
    } else {
      payload.id = crypto.randomUUID();
    }

    console.log('[POST_OBJECTIVE] Payload final para INSERT:', JSON.stringify(payload, null, 2));

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('objectives')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('[POST_OBJECTIVE] ⛔ INSERT falló:', error.message);
      return NextResponse.json(
        { error: `Error de base de datos: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('[POST_OBJECTIVE] ✅ INSERT exitoso, id:', data?.id);

    invalidarCache('objectives');
    serverCache.invalidatePattern('dashboard-map');

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[POST_OBJECTIVE_ERROR]', error);
    return NextResponse.json(
      { error: error?.message || 'Error al procesar objetivo' },
      { status: 500 }
    );
  }
}
