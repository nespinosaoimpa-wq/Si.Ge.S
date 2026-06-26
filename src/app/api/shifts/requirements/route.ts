import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET: List shift requirements
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const objectiveId = searchParams.get('objective_id');
    const status = searchParams.get('status');

    const supabase = createServiceClient();
    let query = supabase.from('shift_requirements').select(`
      *,
      objectives:objective_id(name, address)
    `);

    if (objectiveId) {
      query = query.eq('objective_id', objectiveId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    // Order by start_time ascending
    const { data: requirements, error } = await query.order('start_time', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ requirements });
  } catch (error: any) {
    console.error('[SHIFT_REQUIREMENTS_GET]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new shift requirement
export async function POST(request: Request) {
  try {
    const { objective_id, start_time, end_time, required_role, notes } = await request.json();

    if (!objective_id || !start_time || !end_time) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (objetivo, inicio, fin)' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: requirement, error } = await supabase
      .from('shift_requirements')
      .insert({
        objective_id,
        start_time,
        end_time,
        required_role: required_role || 'vigilador',
        status: 'unassigned',
        notes: notes || 'Requerimiento de cobertura programada'
      })
      .select()
      .single();

    if (error) throw error;

    // Check if the created requirement starts in less than 24 hours and auto-generate alarm
    try {
      const now = new Date();
      const startTimeDate = new Date(start_time);
      const timeDiff = startTimeDate.getTime() - now.getTime();
      
      if (timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000) {
        const { data: existingAlarm } = await supabase
          .from('alarms')
          .select('id')
          .eq('objective_id', objective_id)
          .eq('alarm_type', 'cobertura_pendiente')
          .eq('status', 'active')
          .limit(1);

        if (!existingAlarm || existingAlarm.length === 0) {
          const { data: objective } = await supabase
            .from('objectives')
            .select('name')
            .eq('id', objective_id)
            .single();

          const formattedTime = startTimeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          await supabase.from('alarms').insert({
            triggered_by: 'system_scheduler',
            objective_id,
            alarm_type: 'cobertura_pendiente',
            message: `🚨 ALERTA COBERTURA: Falta asignar personal para el turno de las ${formattedTime} hs en ${objective?.name || 'objetivo'}`,
            status: 'active'
          });
        }
      }
    } catch (alarmErr) {
      console.error('[AUTO_ALERT_POST_ERROR]', alarmErr);
    }

    return NextResponse.json({ requirement });
  } catch (error: any) {
    console.error('[SHIFT_REQUIREMENTS_POST]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
