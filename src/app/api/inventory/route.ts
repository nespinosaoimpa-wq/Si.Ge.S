import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

function getTenantId(request: NextRequest): string | null {
  const userCookie = request.cookies.get('SIGPAD_user');
  if (userCookie) {
    try {
      const u = JSON.parse(decodeURIComponent(userCookie.value));
      return u.tenant_id || u.user_metadata?.tenant_id || null;
    } catch (e) {
      console.error('[INVENTORY_GET_TENANT_ERROR]', e);
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const objectiveId = searchParams.get('objective_id');
    const resourceId = searchParams.get('resource_id') || searchParams.get('operator_id');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const supabase = createServiceClient();
    let query = supabase.from('resource_inventory').select('*').order('created_at', { ascending: false });

    const tenantId = getTenantId(request);
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    if (objectiveId) query = query.eq('objective_id', objectiveId);
    if (resourceId) query = query.eq('resource_id', resourceId);
    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) {
      console.error('[INVENTORY_GET_ERROR] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('[INVENTORY_GET_ERROR] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const tenantId = getTenantId(request);
    const quantity = Math.max(1, parseInt(body.quantity) || 1);
    const objective_id = (body.objective_id && String(body.objective_id).trim() !== '' && body.objective_id !== 'null') ? body.objective_id : null;
    const resource_id = (body.resource_id && String(body.resource_id).trim() !== '' && body.resource_id !== 'null') ? body.resource_id : null;

    const itemsToInsert: any[] = [];
    for (let i = 0; i < quantity; i++) {
      itemsToInsert.push({
        item_name: quantity > 1 ? `${body.item_name} #${i + 1}` : body.item_name,
        serial_number: body.serial_number ? (quantity > 1 ? `${body.serial_number}-${i + 1}` : body.serial_number) : null,
        category: body.category || 'otros',
        status: body.status || 'operativo',
        objective_id: objective_id,
        resource_id: resource_id,
        notes: body.notes || null,
        tenant_id: tenantId
      });
    }

    const { data, error } = await supabase.from('resource_inventory').insert(itemsToInsert as any).select();

    if (error) {
      console.error('[INVENTORY_POST_ERROR] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('[INVENTORY_POST_ERROR] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Se requiere el ID del elemento' }, { status: 400 });
    }

    if (updates.objective_id !== undefined) {
      if (!updates.objective_id || String(updates.objective_id).trim() === '' || updates.objective_id === 'null') {
        updates.objective_id = null;
      }
    }

    if (updates.resource_id !== undefined) {
      if (!updates.resource_id || String(updates.resource_id).trim() === '' || updates.resource_id === 'null') {
        updates.resource_id = null;
      }
    }

    const { data, error } = await supabase.from('resource_inventory').update(updates as any).eq('id', id).select();

    if (error) {
      console.error('[INVENTORY_PATCH_ERROR] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[INVENTORY_PATCH_ERROR] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Se requiere el ID del elemento' }, { status: 400 });
    }

    const { error } = await supabase.from('resource_inventory').delete().eq('id', id);

    if (error) {
      console.error('[INVENTORY_DELETE_ERROR] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('[INVENTORY_DELETE_ERROR] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
