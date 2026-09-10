import { createServiceClient } from '@/lib/supabase-server';
import { isConfigured } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantFromRequest } from '@/lib/resolve-tenant';

const VALID_DB_COLUMNS = new Set([
  'id', 'name', 'role', 'status', 'latitude', 'longitude', 'accuracy', 'speed',
  'heading', 'battery_level', 'last_gps_update', 'phone', 'email', 'dni',
  'address', 'hiring_date', 'salary', 'avatar_url', 'assigned_to', 'shirt_size',
  'pants_size', 'boot_size', 'last_uniform_delivery', 'credential_number',
  'credential_expiry', 'psych_expiry', 'license_expiry', 'training_expiry',
  'sanctions', 'medical_records', 'leaves', 'documents', 'performance_data',
  'hourly_pay_rate', 'current_shift_id', 'current_objective_id', 'profile_id',
  'created_at', 'updated_at', 'tenant_id'
]);

function unpackResource(row: any) {
  if (!row) return row;
  const docs = typeof row.documents === 'object' && row.documents !== null ? row.documents : {};
  return {
    ...docs,
    ...row,
    hourly_pay_rate: row.hourly_pay_rate ?? (row.salary ? parseFloat(String(row.salary).replace(/[^0-9.]/g, '')) : null),
    objectives: row.assigned_objective || row.objectives
  };
}

function sanitizeResourcePayload(body: any, existingDocs: any = {}) {
  const cleaned: any = {};
  const extraDocs: any = typeof existingDocs === 'object' && existingDocs !== null ? { ...existingDocs } : {};

  for (const [key, value] of Object.entries(body)) {
    if (key === 'assigned_objective' || key === 'objectives' || key === 'id') {
      continue;
    }
    const val = value === '' ? null : value;
    if (VALID_DB_COLUMNS.has(key)) {
      cleaned[key] = val;
    } else {
      extraDocs[key] = val;
    }
  }

  if (Object.keys(extraDocs).length > 0) {
    cleaned.documents = extraDocs;
  }

  return cleaned;
}

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
    const showAll = req.nextUrl.searchParams.get('all') === 'true';

    const supabase = createServiceClient();
    let query = supabase
      .from('resources')
      .select('id, name, role, status, latitude, longitude, phone, email, dni, address, hiring_date, salary, avatar_url, assigned_to, hourly_pay_rate, current_objective_id, profile_id, created_at, updated_at, tenant_id, assigned_objective:objectives(name)')
      .neq('status', 'baja');

    if (tenantId && (!isSuper || !showAll)) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: rawData, error: fetchError } = await query.order('name');

    if (fetchError) throw fetchError;

    const finalData = (rawData || []).map(unpackResource);

    return NextResponse.json(finalData, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=15'
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

    const supabase = createServiceClient();

    const normalizedEmail = body.email ? String(body.email).toLowerCase().trim() : null;

    // Check if a resource record with this email already exists in resources table
    let existingResource: any = null;
    if (normalizedEmail) {
      const { data: found } = await supabase
        .from('resources')
        .select('id, documents')
        .ilike('email', normalizedEmail)
        .maybeSingle();
      existingResource = found;
    }

    const cleanedBody = sanitizeResourcePayload(body, existingResource?.documents);

    if (targetTenantId) {
      cleanedBody.tenant_id = targetTenantId;
    }

    if ('hourly_pay_rate' in body && body.hourly_pay_rate !== undefined) {
      const numRate = body.hourly_pay_rate === '' || body.hourly_pay_rate === null ? null : String(body.hourly_pay_rate);
      cleanedBody.salary = numRate;
      cleanedBody.hourly_pay_rate = numRate ? parseFloat(numRate) : null;
    }

    if (normalizedEmail) {
      cleanedBody.email = normalizedEmail;
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

    return NextResponse.json(unpackResource(data));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al procesar el alta de personal' }, { status: 500 });
  }
}
