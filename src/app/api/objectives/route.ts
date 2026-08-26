import { isConfigured } from '@/lib/supabase';
import { createServiceClient, hasAdminAccess } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { invalidarCache, serverCache } from '@/lib/cache';

// ──────────────────────────────────────────────────────────────────────────────
// SIGPAD — API Route: /api/objectives
// ──────────────────────────────────────────────────────────────────────────────

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
    let userEmail: string | null = null;

    const userCookie = req.cookies.get('SIGPAD_user');
    if (userCookie) {
      try {
        const user = JSON.parse(decodeURIComponent(userCookie.value));
        userId = user?.id;
        userEmail = user?.email;
        tenantId = user?.tenant_id || user?.user_metadata?.tenant_id;
        const userRole = (user?.role || user?.user_metadata?.role || '').toLowerCase();
        isSuper = (userRole === 'superadmin') && (!tenantId || tenantId === 'a1b2c3d4-0001-0001-0001-000000000001');
      } catch (e) {
        console.warn('[GET_OBJECTIVES] Cookie parse warning:', e);
      }
    }

    if (!tenantId && !isSuper && (userId || userEmail)) {
      try {
        const supabase = createServiceClient();
        if (userId) {
          const { data: dbUser } = await supabase.from('users').select('tenant_id').eq('id', userId).maybeSingle();
          if (dbUser?.tenant_id) tenantId = dbUser.tenant_id;
        }
        if (!tenantId && userEmail) {
          const { data: authU } = await supabase.from('authorized_users').select('tenant_id').ilike('email', userEmail).maybeSingle();
          if (authU?.tenant_id) tenantId = authU.tenant_id;
        }
        if (!tenantId && userEmail) {
          const { data: res } = await supabase.from('resources').select('tenant_id').ilike('email', userEmail).maybeSingle();
          if (res?.tenant_id) tenantId = res.tenant_id;
        }
        if (!tenantId && userEmail) {
          const { data: t } = await supabase.from('tenants').select('id').ilike('admin_email', userEmail).order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (t?.id) tenantId = t.id;
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
        if (tenantId === 'a1b2c3d4-0001-0001-0001-000000000001') {
          query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
        } else {
          query = query.eq('tenant_id', tenantId);
        }
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
  // ── Diagnóstico de configuración ─────────────────────────────────────────
  const keyType = hasAdminAccess() ? 'SERVICE_ROLE ✅' : 'ANON_FALLBACK ⛔ (RLS activo — escrituras pueden fallar)';
  console.log(`[POST_OBJECTIVE] Key type: ${keyType}`);
  console.log(`[POST_OBJECTIVE] URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'HARDCODED_FALLBACK'}`);

  try {
    let tenantId: string | null = null;
    let isSuper = false;
    let userId: string | null = null;
    let userEmail: string | null = null;

    const userCookie = req.cookies.get('SIGPAD_user');
    if (userCookie) {
      try {
        const user = JSON.parse(decodeURIComponent(userCookie.value));
        userId = user?.id;
        userEmail = user?.email;
        tenantId = user?.tenant_id || user?.user_metadata?.tenant_id;
        const userRole = (user?.role || user?.user_metadata?.role || '').toLowerCase();
        isSuper = (userRole === 'superadmin') && (!tenantId || tenantId === 'a1b2c3d4-0001-0001-0001-000000000001');
      } catch (e) {
        console.warn('[POST_OBJECTIVE] Cookie parse warning:', e);
      }
    }

    if (!tenantId && !isSuper && (userId || userEmail)) {
      try {
        const supabase = createServiceClient();
        if (userId) {
          const { data: dbUser } = await supabase.from('users').select('tenant_id').eq('id', userId).maybeSingle();
          if (dbUser?.tenant_id) tenantId = dbUser.tenant_id;
        }
        if (!tenantId && userEmail) {
          const { data: authU } = await supabase.from('authorized_users').select('tenant_id').ilike('email', userEmail).maybeSingle();
          if (authU?.tenant_id) tenantId = authU.tenant_id;
        }
        if (!tenantId && userEmail) {
          const { data: res } = await supabase.from('resources').select('tenant_id').ilike('email', userEmail).maybeSingle();
          if (res?.tenant_id) tenantId = res.tenant_id;
        }
        if (!tenantId && userEmail) {
          const { data: t } = await supabase.from('tenants').select('id').ilike('admin_email', userEmail).order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (t?.id) tenantId = t.id;
        }
      } catch (err: any) {
        console.warn('[POST_OBJECTIVE] Excepción al buscar tenant en DB:', err?.message);
      }
    }

    const body = await req.json().catch(() => ({}));

    const isValidUUID = (uuid: any) => {
      if (typeof uuid !== 'string') return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
    };

    let targetTenantId = isSuper ? (body.tenant_id || tenantId) : tenantId;

    if (targetTenantId && !isValidUUID(targetTenantId)) {
      console.warn(`[POST_OBJECTIVE] ⚠️ tenant_id inválido ignorado: "${targetTenantId}"`);
      targetTenantId = null;
    }

    if (!targetTenantId) {
      try {
        const supabaseAdmin = createServiceClient();
        const { data: latestTenant } = await supabaseAdmin
          .from('tenants')
          .select('id')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        targetTenantId = latestTenant?.id || null;
      } catch (err: any) {
        console.warn('[POST_OBJECTIVE] Excepción al buscar tenant fallback:', err?.message);
        targetTenantId = null;
      }
    } else {
      try {
        const supabaseAdmin = createServiceClient();
        const { data: tenantExists, error: existsErr } = await supabaseAdmin
          .from('tenants')
          .select('id')
          .eq('id', targetTenantId)
          .maybeSingle();

        if (existsErr) {
          console.warn('[POST_OBJECTIVE] Error verificando tenant:', existsErr.message);
        }

        if (!tenantExists) {
          console.warn(`[POST_OBJECTIVE] ⚠️ tenant_id ${targetTenantId} no existe en tabla tenants — buscando fallback`);
          const { data: fallbackTenant } = await supabaseAdmin
            .from('tenants')
            .select('id')
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          targetTenantId = fallbackTenant?.id || null;
          console.log(`[POST_OBJECTIVE] tenant_id fallback (existente): ${targetTenantId}`);
        }
      } catch (err: any) {
        console.warn('[POST_OBJECTIVE] Excepción verificando tenant:', err?.message);
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
      tenant_id: targetTenantId,
    };

    // ── Log del payload completo antes del insert ────────────────────────────
    console.log('[POST_OBJECTIVE] Payload final para INSERT:', JSON.stringify(payload, null, 2));

    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from('objectives')
        .insert([payload])
        .select()
        .single();

      if (error) {
        // ── Diagnóstico detallado del error de inserción ─────────────────────
        console.error('[POST_OBJECTIVE] ⛔ INSERT falló:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          keyType,
          tenant_id: targetTenantId,
        });

        // ── Intento de retry con tenant_id: null ─────────────────────────────
        console.log('[POST_OBJECTIVE] Intentando retry con tenant_id: null...');
        const retryPayload = { ...payload, tenant_id: null };

        const { data: retryData, error: retryError } = await supabase
          .from('objectives')
          .insert([retryPayload])
          .select()
          .single();

        if (retryError) {
          console.error('[POST_OBJECTIVE] ⛔ Retry con tenant_id: null también falló:', {
            message: retryError.message,
            code: retryError.code,
            details: retryError.details,
            hint: retryError.hint,
          });
          return NextResponse.json(
            {
              error: `Error de base de datos: ${retryError.message}`,
              code: retryError.code,
              hint: retryError.hint || 'Verificar /api/diagnostics/supabase para diagnóstico completo',
              keyType,
            },
            { status: 500 }
          );
        }

        console.log('[POST_OBJECTIVE] ✅ Retry exitoso con tenant_id: null, id:', retryData?.id);

        invalidarCache('objectives');
        serverCache.invalidatePattern('dashboard-map');
        return NextResponse.json(retryData);
      }

      console.log('[POST_OBJECTIVE] ✅ INSERT exitoso, id:', data?.id);
      invalidarCache('objectives');
      serverCache.invalidatePattern('dashboard-map');
      return NextResponse.json(data);
    } catch (dbError: any) {
      console.error('[POST_OBJECTIVE] ⛔ Excepción en ejecución Supabase:', dbError?.message);
      return NextResponse.json(
        { error: `Excepción de base de datos: ${dbError?.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[POST_OBJECTIVE_ERROR]', error);
    return NextResponse.json(
      { error: error?.message || 'Error al procesar objetivo' },
      { status: 500 }
    );
  }
}
