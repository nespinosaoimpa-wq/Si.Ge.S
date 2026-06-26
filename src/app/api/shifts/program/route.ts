import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { operator_id, objective_id, start_time, end_time, notes } = await request.json();

    if (!operator_id || !objective_id || !start_time || !end_time) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (operador, objetivo, inicio, fin)' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify operator is not assigned to a different objective
    const { data: existingOperator } = await supabase
      .from('resources')
      .select('current_objective_id')
      .eq('id', operator_id)
      .single();

    if (existingOperator?.current_objective_id && existingOperator.current_objective_id !== objective_id) {
      return NextResponse.json({ 
        error: 'Este operador ya está vinculado a otro objetivo. Desvincular primero.' 
      }, { status: 409 });
    }

    // 1. Create the programmed shift
    const { data: shift, error: shiftError } = await supabase
      .from('guard_shifts')
      .insert({
        operator_id,
        objective_id,
        checkin_time: start_time, // We use checkin_time as the "scheduled start"
        checkout_time: end_time,   // We use checkout_time as the "scheduled end"
        status: 'programado',
        notes: notes || 'Turno programado por gerencia'
      })
      .select()
      .single();

    if (shiftError) throw shiftError;

    // 2. Also update the resource's current objective to ensure visibility
    // (Optional: depending on if we want it to be their "permanent" objective now or only when they check in)
    // The user said "designe al operador que servicio le toca", so we update it.
    await supabase
      .from('resources')
      .update({ current_objective_id: objective_id })
      .eq('id', operator_id);

    return NextResponse.json({ shift });
  } catch (error: any) {
    console.error('[PROGRAM_SHIFT]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
