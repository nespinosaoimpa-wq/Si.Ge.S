import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { item_id, condition, notes, objective_id, resource_id } = await request.json();

    if (!item_id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Update the item condition
    const { error: updateError } = await supabase
      .from('resource_inventory')
      .update({ 
        status: condition || 'roto',
        updated_at: new Date().toISOString()
      })
      .eq('id', item_id);

    if (updateError) throw updateError;

    // 2. Create a log entry
    const { error: logError } = await supabase
      .from('inventory_logs')
      .insert([{
        item_id,
        action_type: 'reporte_falla',
        new_condition: condition || 'roto',
        notes: notes || 'Reportado por operador en campo',
        performed_by: resource_id, // Assuming resource_id can be mapped or we use the authenticated user
        new_objective_id: objective_id
      }]);

    // 3. Create a guard book entry for visibility
    await supabase.from('guard_book_entries').insert([{
      objective_id,
      operator_id: resource_id,
      entry_type: 'incidente',
      content: `FALLA TÉCNICA REPORTADA: Se ha marcado el equipo como ${condition?.toUpperCase() || 'ROTO'}. Notas: ${notes || 'Sin detalles'}`
    }]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error reporting inventory damage:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
