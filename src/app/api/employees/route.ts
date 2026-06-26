import { createServiceClient } from '@/lib/supabase-server';
import { isConfigured } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    if (!isConfigured) {
      // Mock data for local testing without Supabase keys
      return NextResponse.json([
        { id: 'S-701', name: 'NICO ESPINOSA', role: 'Gerente Operativo', status: 'active', dni: '30.123.456', email: 'nico@Si.Ge.S.com' },
        { id: 'S-802', name: 'CARLOS GIMENEZ', role: 'Vigilador Senior', status: 'active' },
        { id: 'S-905', name: 'ANA MARTINEZ', role: 'Vigilador', status: 'active' },
        { id: 'S-102', name: 'PEDRO GOMEZ', role: 'Vigilador', status: 'inactive' },
      ]);
    }

    const supabase = createServiceClient();

    const { data: rawData, error: fetchError } = await supabase
      .from('resources')
      .select('*, assigned_objective:objectives(name)')
      .neq('status', 'baja')
      .order('name');

    if (fetchError) throw fetchError;

    // Map 'salary' to 'hourly_pay_rate' for frontend compatibility
    const finalData = (rawData || []).map(r => ({
      ...r,
      hourly_pay_rate: r.salary,
      objectives: r.assigned_objective
    }));

    return NextResponse.json(finalData, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    // Clean up body: Convert empty strings to null for database compatibility,
    // filter out non-database properties like assigned_objective, objectives, and hourly_pay_rate,
    // and map hourly_pay_rate to the salary column.
    const cleanedBody: any = {};
    for (const [key, value] of Object.entries(body)) {
      if (key === 'assigned_objective' || key === 'objectives' || key === 'hourly_pay_rate') {
        continue;
      }
      cleanedBody[key] = value === '' ? null : value;
    }

    if ('hourly_pay_rate' in body) {
      cleanedBody.salary = body.hourly_pay_rate === '' ? null : String(body.hourly_pay_rate);
    }

    const { data, error } = await supabase
      .from('resources')
      .insert([cleanedBody])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
