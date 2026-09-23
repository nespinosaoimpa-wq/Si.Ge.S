import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { serverCache } from '@/lib/cache';

const ALLOWED_OBJECTIVE_COLUMNS = new Set([
  'name', 'address', 'client_name', 'contact_phone',
  'latitude', 'longitude', 'geofence_radius',
  'is_active', 'hourly_billing_rate', 'tenant_id', 'updated_at'
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('objectives')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Objetivo no encontrado' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching objective:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    const cleanedBody: any = {
      updated_at: new Date().toISOString()
    };

    if ('status' in body) {
      cleanedBody.is_active = body.status === 'Activo';
    }

    if ('geofence_radius_meters' in body && body.geofence_radius_meters != null) {
      cleanedBody.geofence_radius = Number(body.geofence_radius_meters);
    }

    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_OBJECTIVE_COLUMNS.has(key)) {
        cleanedBody[key] = value === '' ? null : value;
      }
    }

    let { data, error } = await supabase
      .from('objectives')
      .update(cleanedBody)
      .eq('id', id)
      .select()
      .maybeSingle();

    // Fallback: If a column like 'notes' or 'geofence_radius_meters' is missing in DB schema, strip missing keys and retry
    if (error && (error.message.includes('schema cache') || error.message.includes('column'))) {
      console.warn('[OBJECTIVE_PATCH] Retrying update with core schema columns due to DB schema variation:', error.message);
      
      const coreBody: any = { updated_at: new Date().toISOString() };
      const CORE_COLUMNS = ['name', 'address', 'client_name', 'contact_phone', 'latitude', 'longitude', 'geofence_radius', 'is_active', 'hourly_billing_rate'];
      
      for (const col of CORE_COLUMNS) {
        if (cleanedBody[col] !== undefined) {
          coreBody[col] = cleanedBody[col];
        }
      }

      const retryRes = await supabase
        .from('objectives')
        .update(coreBody)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!retryRes.error) {
        data = retryRes.data;
        error = null;
      }
    }

    if (error) {
      console.error('[OBJECTIVE_PATCH_ERROR]', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Invalidate caches
    const targetTenantId = data?.tenant_id;
    if (targetTenantId) {
      serverCache.invalidate(`objectives-${targetTenantId}`);
      serverCache.invalidate(`dashboard-map-${targetTenantId}`);
    }
    serverCache.invalidate(`objectives-super`);
    serverCache.invalidate(`dashboard-map-super`);

    return NextResponse.json(data || { success: true, id });
  } catch (error: any) {
    console.error('[OBJECTIVE_PATCH_EXCEPTION]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // 1. Unassign resources linked to this objective
    await supabase.from('resources').update({ current_objective_id: null }).eq('current_objective_id', id);

    // 2. Perform real delete from Supabase
    const { data: targetObj } = await supabase.from('objectives').select('tenant_id').eq('id', id).maybeSingle();
    const { error: deleteErr } = await supabase.from('objectives').delete().eq('id', id);

    if (deleteErr) {
      console.warn("Hard delete failed in SIGPAD, performing soft delete:", deleteErr.message);
      await supabase
        .from('objectives')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
    }
    
    // CACHE INVALIDATION
    const targetTenantId = targetObj?.tenant_id;
    if (targetTenantId) {
      serverCache.invalidate(`objectives-${targetTenantId}`);
      serverCache.invalidate(`dashboard-map-${targetTenantId}`);
    }
    serverCache.invalidate(`objectives-super`);
    serverCache.invalidate(`dashboard-map-super`);

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Error deleting objective:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
