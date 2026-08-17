import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const objectiveId = searchParams.get('objective_id');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const supabase = createServiceClient();
    let query = supabase.from('resource_inventory').select('*').order('created_at', { ascending: false });

    if (objectiveId) query = query.eq('objective_id', objectiveId);
    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const userCookie = request.cookies.get('SIGPAD_user');
    let tenantId: string | null = null;
    if (userCookie) {
      try {
        const u = JSON.parse(decodeURIComponent(userCookie.value));
        tenantId = u.tenant_id || u.user_metadata?.tenant_id;
      } catch (e) {}
    }

    const quantity = Math.max(1, parseInt(body.quantity) || 1);
    const objective_id = (body.objective_id && String(body.objective_id).trim() !== '' && body.objective_id !== 'null') ? body.objective_id : null;
    const category = body.category || 'otros';
    const status = body.status || 'operativo';

    const payloads: any[] = [];
    for (let i = 0; i < quantity; i++) {
      const itemPayload: any = {
        item_name: quantity > 1 ? `${body.item_name} #${i + 1}` : body.item_name,
        serial_number: body.serial_number ? (quantity > 1 ? `${body.serial_number}-${i + 1}` : body.serial_number) : null,
        status: status,
        objective_id: objective_id,
        category: category,
        notes: body.notes || null,
      };
      if (tenantId) itemPayload.tenant_id = tenantId;
      payloads.push(itemPayload);
    }

    let { data, error } = await supabase
      .from('resource_inventory')
      .insert(payloads)
      .select();

    // Fallback if table schema lacks new columns (notes, category, tenant_id)
    if (error) {
      console.warn('[INVENTORY] Full insert error, attempting safe fallback payload:', error.message);
      const safePayloads = payloads.map(p => ({
        item_name: p.item_name,
        serial_number: p.serial_number,
        status: p.status || 'operativo',
        objective_id: p.objective_id
      }));

      const fallbackResult = await supabase
        .from('resource_inventory')
        .insert(safePayloads)
        .select();

      if (fallbackResult.error) throw fallbackResult.error;
      data = fallbackResult.data;
      error = null;
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('[INVENTORY_POST_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error al guardar activo' }, { status: 500 });
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

    let { data, error } = await supabase
      .from('resource_inventory')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.warn('[INVENTORY] Update error, retrying safe fallback updates:', error.message);
      const safeUpdates: any = {};
      if (updates.status !== undefined) safeUpdates.status = updates.status;
      if (updates.objective_id !== undefined) safeUpdates.objective_id = updates.objective_id;
      if (updates.item_name !== undefined) safeUpdates.item_name = updates.item_name;
      if (updates.serial_number !== undefined) safeUpdates.serial_number = updates.serial_number;

      const retry = await supabase
        .from('resource_inventory')
        .update(safeUpdates)
        .eq('id', id)
        .select();

      if (retry.error) throw retry.error;
      data = retry.data;
      error = null;
    }

    return NextResponse.json(data?.[0] || { success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    const { error } = await supabase
      .from('resource_inventory')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
