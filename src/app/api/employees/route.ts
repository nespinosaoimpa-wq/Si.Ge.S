import { createServiceClient } from '@/lib/supabase-server';
import { isConfigured } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantFromRequest } from '@/lib/resolve-tenant';

export async function GET(req: NextRequest) {
  try {
    if (!isConfigured) {
      return NextResponse.json([
        { id: 'S-701', name: 'NICO ESPINOSA', role: 'Gerente Operativo', status: 'active', dni: '30.123.456', email: 'nico@SIGPAD.com' },
        { id: 'S-802', name: 'CARLOS GIMENEZ', role: 'Vigilador Senior', status: 'active' },
        { id: 'S-905', name: 'ANA MARTINEZ', role: 'Vigilador', status: 'active' },
        { id: 'S-102', name: 'PEDRO GOMEZ', role: 'Vigilador', status: 'inactive' },
      ]);
    }

    const ctx = await resolveTenantFromRequest(req);
    if (!ctx) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { tenantId, isSuper } = ctx;

    const supabase = createServiceClient();
    let query = supabase
      .from('resources')
      .select('*, assigned_objective:objectives(name)')
      .neq('status', 'baja');

    if (!isSuper && tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: rawData, error: fetchError } = await query.order('name');

    if (fetchError) throw fetchError;

    // Map 'salary' to 'hourly_pay_rate' for frontend compatibility
    const finalData = (rawData || []).map(r => ({
      ...r,
      hourly_pay_rate: r.salary,
      objectives: r.assigned_objective
    }));

    return NextResponse.json(finalData, {
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
    if (!isConfigured) {
      return NextResponse.json({ id: 'mock-resource-id', name: 'Mock Resource' });
    }

    const ctx = await resolveTenantFromRequest(req);
    if (!ctx) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { tenantId, isSuper } = ctx;
    const body = await req.json();

    let targetTenantId = isSuper ? (body.tenant_id || tenantId) : tenantId;

    if (!targetTenantId && !isSuper) {
      return NextResponse.json(
        { error: 'No se puede crear el empleado: tu sesión no tiene empresa asignada.' },
        { status: 400 }
      );
    }

    // Clean up body: Convert empty strings to null for database compatibility
    const cleanedBody: any = {};
    for (const [key, value] of Object.entries(body)) {
      if (key === 'assigned_objective' || key === 'objectives' || key === 'hourly_pay_rate' || key === 'id') {
        continue;
      }
      cleanedBody[key] = value === '' ? null : value;
    }

    if (targetTenantId) {
      cleanedBody.tenant_id = targetTenantId;
    }

    if ('hourly_pay_rate' in body) {
      cleanedBody.salary = body.hourly_pay_rate === '' ? null : String(body.hourly_pay_rate);
    }

    if (cleanedBody.email) {
      cleanedBody.email = String(cleanedBody.email).toLowerCase().trim();
    }

    const supabase = createServiceClient();

    // Check if a resource record with this email already exists in resources table
    let existingResource: any = null;
    if (cleanedBody.email) {
      const { data: found } = await supabase
        .from('resources')
        .select('id')
        .ilike('email', cleanedBody.email)
        .maybeSingle();
      existingResource = found;
    }

    let data: any = null;
    let error: any = null;

    if (existingResource?.id) {
      // UPDATE existing resource record to enrich full employee data instead of failing on unique constraint
      const resUpdate = await supabase
        .from('resources')
        .update(cleanedBody)
        .eq('id', existingResource.id)
        .select()
        .single();
      data = resUpdate.data;
      error = resUpdate.error;
    } else {
      // INSERT new resource record
      const resInsert = await supabase
        .from('resources')
        .insert([cleanedBody])
        .select()
        .single();
      data = resInsert.data;
      error = resInsert.error;
    }

    if (error) {
      if (error.code === '23505' || error.message?.includes('resources_email_key') || error.message?.includes('duplicate key')) {
        return NextResponse.json(
          { error: 'Ya existe un integrante de personal registrado con este correo electrónico.' },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al procesar el alta de personal' }, { status: 500 });
  }
}
