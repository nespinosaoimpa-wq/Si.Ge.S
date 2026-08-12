import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
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

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const quantity = Math.max(1, parseInt(body.quantity) || 1);
    const payloads: any[] = [];

    for (let i = 0; i < quantity; i++) {
      const itemPayload: any = {
        item_name: quantity > 1 ? `${body.item_name} #${i + 1}` : body.item_name,
        serial_number: body.serial_number ? (quantity > 1 ? `${body.serial_number}-${i + 1}` : body.serial_number) : null,
        status: body.status || 'operativo',
        objective_id: body.objective_id || null,
        category: body.category || 'otros',
        notes: body.notes || null,
      };
      payloads.push(itemPayload);
    }

    let { data, error } = await supabase
      .from('resource_inventory')
      .insert(payloads)
      .select();

    // If the error is about missing columns, retry WITHOUT optional columns
    if (error && error.message?.includes('column')) {
      console.warn('[INVENTORY] Column missing, retrying fallback batch:', error.message);
      const fallbackPayloads = payloads.map(p => ({
        item_name: p.item_name,
        serial_number: p.serial_number,
        status: 'Operativo',
        objective_id: p.objective_id
      }));

      const fallbackResult = await supabase
        .from('resource_inventory')
        .insert(fallbackPayloads)
        .select();

      if (fallbackResult.error) throw fallbackResult.error;
      data = fallbackResult.data;
      error = null;
    }

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Se requiere el ID del elemento' }, { status: 400 });
    }

    let { data, error } = await supabase
      .from('resource_inventory')
      .update(updates)
      .eq('id', id)
      .select();

    if (error && error.message?.includes('column')) {
      console.warn('[INVENTORY] Column missing in update, retrying fallback:', error.message);
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

    if (error) throw error;
    return NextResponse.json(data?.[0] || { success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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
