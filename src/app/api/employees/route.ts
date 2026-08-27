import { createServiceClient } from '@/lib/supabase-server';
import { isConfigured } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    if (!isConfigured) {
      // Mock data for local testing without Supabase keys
      return NextResponse.json([
        { id: 'S-701', name: 'NICO ESPINOSA', role: 'Gerente Operativo', status: 'active', dni: '30.123.456', email: 'nico@SIGPAD.com' },
        { id: 'S-802', name: 'CARLOS GIMENEZ', role: 'Vigilador Senior', status: 'active' },
        { id: 'S-905', name: 'ANA MARTINEZ', role: 'Vigilador', status: 'active' },
        { id: 'S-102', name: 'PEDRO GOMEZ', role: 'Vigilador', status: 'inactive' },
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
      const supabase = createServiceClient();
      const { data: dbUser } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', userId)
        .maybeSingle();
      if (dbUser?.tenant_id) {
        tenantId = dbUser.tenant_id;
      }
    }

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
      const supabase = createServiceClient();
      const { data: dbUser } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', userId)
        .maybeSingle();
      if (dbUser?.tenant_id) {
        tenantId = dbUser.tenant_id;
      }
    }

    const body = await req.json();

    // Enforce tenant_id injection. Non-superadmins must use their own tenantId.
    let targetTenantId = isSuper ? (body.tenant_id || tenantId) : tenantId;

    // Si no se pudo resolver el tenant, rechazar la operación
    if (!targetTenantId) {
      return NextResponse.json(
        { error: 'No se puede crear el empleado: no hay empresa asignada en la sesión.' },
        { status: 400 }
      );
    }

    // Clean up body: Convert empty strings to null for database compatibility,
    // filter out non-database properties like assigned_objective, objectives, and hourly_pay_rate,
    // and map hourly_pay_rate to the salary column.
    const cleanedBody: any = {};
    for (const [key, value] of Object.entries(body)) {
      if (key === 'assigned_objective' || key === 'objectives' || key === 'hourly_pay_rate') {
        continue;
      }
      cleanedBody[key] = value === '' ? null : value;
    }

    cleanedBody.tenant_id = targetTenantId;

    if ('hourly_pay_rate' in body) {
      cleanedBody.salary = body.hourly_pay_rate === '' ? null : String(body.hourly_pay_rate);
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('resources')
      .insert([cleanedBody])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
