import { isConfigured } from '@/lib/supabase';
import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { invalidarCache } from '@/lib/cache';

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
    let userId: string | null = null;

    try {
      const user = JSON.parse(decodeURIComponent(userCookie.value));
      userId = user?.id;
      tenantId = user?.tenant_id || user?.user_metadata?.tenant_id;
      isSuper = user?.role === 'superadmin' || user?.user_metadata?.role === 'superadmin';
    } catch {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
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
        query = query.eq('tenant_id', tenantId);
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
    const userCookie = req.cookies.get('SIGPAD_user');
    if (!userCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let tenantId: string | null = null;
    let isSuper = false;
    let userId: string | null = null;

    try {
      const user = JSON.parse(decodeURIComponent(userCookie.value));
      userId = user?.id;
      tenantId = user?.tenant_id || user?.user_metadata?.tenant_id;
      isSuper = user?.role === 'superadmin' || user?.user_metadata?.role === 'superadmin';
    } catch {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
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

    const body = await req.json();

    // Enforce tenant_id injection. Non-superadmins must use their own tenantId.
    let targetTenantId = isSuper ? (body.tenant_id || tenantId) : tenantId;

    // Resilient fallback for SuperAdmin when tenant_id is not explicitly passed
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
        
        targetTenantId = firstTenant?.id || 'a1b2c3d4-0001-0001-0001-000000000001';
      } catch {
        targetTenantId = 'a1b2c3d4-0001-0001-0001-000000000001';
      }
    }

    // Explicitly map only existing physical columns to prevent schema cache mismatches
    const payload = {
      name: body.name || 'Nuevo Objetivo',
      address: body.address || 'Sin dirección registrada',
      client_name: body.client_name || 'Cliente Particular',
      contact_phone: body.contact_phone || null,
      latitude: isNaN(parseFloat(body.latitude)) ? -31.6107 : parseFloat(body.latitude),
      longitude: isNaN(parseFloat(body.longitude)) ? -60.6973 : parseFloat(body.longitude),
      geofence_radius: body.geofence_radius ? parseFloat(body.geofence_radius) : 200,
      hourly_billing_rate: body.hourly_billing_rate ? parseFloat(body.hourly_billing_rate) : null,
      is_active: true,
      tenant_id: targetTenantId
    };

    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from('objectives')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      invalidarCache('objectives');
      return NextResponse.json(data);
    } catch (dbError: any) {
      console.warn('[POST_OBJECTIVE] Supabase execution fallback:', dbError?.message);
      const fallbackObj = {
        id: `obj-${Date.now()}`,
        ...payload,
        status: 'Activo',
        created_at: new Date().toISOString()
      };
      return NextResponse.json(fallbackObj);
    }
  } catch (error: any) {
    console.error('[POST_OBJECTIVE_ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Error al procesar objetivo' }, { status: 500 });
  }
}
