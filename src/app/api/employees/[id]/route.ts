import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { serverCache } from '@/lib/cache';

const ALLOWED_RESOURCE_COLUMNS = new Set([
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    const { id } = await params;

    let { data, error } = await supabase
      .from('resources')
      .select('*, objectives!current_objective_id(name)')
      .eq('id', id)
      .single();

    if (error) {
      const fallback = await supabase
        .from('resources')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fallback.error) {
        return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 });
      }
      data = fallback.data;
    }

    return NextResponse.json(unpackResource(data));
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();

    // Fetch existing resource to get current documents JSON
    const { data: existing } = await supabase
      .from('resources')
      .select('documents')
      .eq('id', id)
      .maybeSingle();

    const existingDocs = typeof existing?.documents === 'object' && existing?.documents !== null ? existing.documents : {};
    const extraDocs = { ...existingDocs };

    // Clean up body: keep known DB columns, store extra form fields in documents JSON
    const cleanedBody: any = {};
    for (const [key, value] of Object.entries(body)) {
      if (key === 'id' || key === 'objectives' || key === 'assigned_objective') continue;
      const val = value === '' ? null : value;
      if (ALLOWED_RESOURCE_COLUMNS.has(key)) {
        cleanedBody[key] = val;
      } else {
        extraDocs[key] = val;
      }
    }

    if (Object.keys(extraDocs).length > 0) {
      cleanedBody.documents = extraDocs;
    }

    if ('hourly_pay_rate' in body && body.hourly_pay_rate !== undefined) {
      const numRate = body.hourly_pay_rate === '' || body.hourly_pay_rate === null 
        ? null 
        : Number(body.hourly_pay_rate);
      if (numRate !== null && !isNaN(numRate)) {
        cleanedBody.hourly_pay_rate = numRate;
        cleanedBody.salary = `$${numRate.toLocaleString('es-AR')}`;
      }
    }

    const { data, error } = await supabase
      .from('resources')
      .update(cleanedBody)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[EMPLOYEE_PATCH_ERROR]', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Invalidate caches
    if (data?.tenant_id) {
      serverCache.invalidate(`dashboard-map-${data.tenant_id}`);
    }
    serverCache.invalidate(`dashboard-map-super`);

    return NextResponse.json(unpackResource(data));
  } catch (error: any) {
    console.error('[EMPLOYEE_PATCH_EXCEPTION]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
