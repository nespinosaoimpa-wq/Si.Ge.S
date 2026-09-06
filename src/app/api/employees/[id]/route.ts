import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { serverCache } from '@/lib/cache';

const ALLOWED_RESOURCE_COLUMNS = new Set([
  'name', 'role', 'status', 'latitude', 'longitude', 'accuracy', 'speed', 'heading',
  'battery_level', 'last_gps_update', 'phone', 'email', 'dni', 'cuil', 'address', 'hiring_date',
  'salary', 'avatar_url', 'assigned_to', 'shirt_size', 'pants_size', 'boot_size',
  'last_uniform_delivery', 'uniform_delivery_date', 'uniform_expiry_date', 'custom_uniforms',
  'credential_number', 'credential_expiry', 'clu_number', 'clu_expiry',
  'drivers_license_category', 'drivers_license_expiry', 'psych_expiry',
  'license_expiry', 'training_expiry', 'sanctions', 'medical_records', 'leaves',
  'documents', 'performance_data', 'hourly_pay_rate', 'current_shift_id',
  'current_objective_id', 'profile_id', 'tenant_id'
]);

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

    return NextResponse.json(data);
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

    // Clean up body: only keep columns that exist in the `resources` table
    const cleanedBody: any = {};
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_RESOURCE_COLUMNS.has(key)) {
        cleanedBody[key] = value === '' ? null : value;
      }
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

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[EMPLOYEE_PATCH_EXCEPTION]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
