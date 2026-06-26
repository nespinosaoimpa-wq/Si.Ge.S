import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { objective_id, resource_id, shift_id, items } = body;

    if (!objective_id || !resource_id || !items) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Guardar el reporte de handoff
    const { data: handoff, error: handoffError } = await supabase
      .from('inventory_handoffs')
      .insert([{ objective_id, resource_id, shift_id, items }])
      .select()
      .single();

    if (handoffError) throw handoffError;

    // 2. Actualizar el estado de los items en el inventario principal
    // (Optimizamos haciendo update masivo de a uno por simplicidad, o podríamos hacer bulk)
    for (const item of items) {
      if (item.condition) {
        await supabase
          .from('resource_inventory')
          .update({ status: item.condition, updated_at: new Date().toISOString() })
          .eq('id', item.item_id);
          
        // Si el estado es roto o faltante, generamos un incidente en el libro de guardia
        if (item.condition === 'roto' || item.condition === 'faltante') {
           await supabase.from('guard_book_entries').insert({
             objective_id,
             operator_id: resource_id,
             entry_type: 'incidente',
             content: `ALERTA INVENTARIO: El elemento ${item.name || item.item_id} fue reportado como ${item.condition.toUpperCase()}${item.notes ? ` - Notas: ${item.notes}` : ''}`,
             urgency: 'alta'
           });
        }
      }
    }

    return NextResponse.json({ success: true, handoff });
  } catch (error: any) {
    console.error('[INVENTORY_HANDOFF]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
