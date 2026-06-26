import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    const { id } = await params;

    // Try with explicit FK join first
    let { data, error } = await supabase
      .from('resources')
      .select('*, objectives!current_objective_id(name)')
      .eq('id', id)
      .single();

    // Fallback without join if PGRST200 ambiguity error
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
    // Clean up body: Convert empty strings to null for database compatibility,
    // filter out non-database properties like id, assigned_objective, objectives, and hourly_pay_rate,
    // and map hourly_pay_rate to the salary column.
    const cleanedBody: any = {};
    for (const [key, value] of Object.entries(body)) {
      if (key === 'id' || key === 'assigned_objective' || key === 'objectives' || key === 'hourly_pay_rate') {
        continue;
      }
      cleanedBody[key] = value === '' ? null : value;
    }

    if ('hourly_pay_rate' in body) {
      cleanedBody.salary = body.hourly_pay_rate === '' ? null : String(body.hourly_pay_rate);
    }

    if (body.current_objective_id) {
      const { data: existing } = await supabase
        .from('resources')
        .select('current_objective_id')
        .eq('id', id)
        .single();
      
      if (existing?.current_objective_id && 
          existing.current_objective_id !== body.current_objective_id) {
        return NextResponse.json({ 
          error: 'Este operador ya está vinculado a otro objetivo. Desvincular primero.' 
        }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from('resources')
      .update(cleanedBody)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
