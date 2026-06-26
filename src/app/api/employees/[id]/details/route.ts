import { createServiceClient } from '@/lib/supabase-server';
import { isConfigured } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isConfigured) {
      return NextResponse.json({
        profile: { id, name: 'OPERADOR MOCK', role: 'Vigilador', status: 'active', current_objective_id: 'OBJ-001' },
        shifts: []
      });
    }

    const supabase = createServiceClient();

    // 1. Fetch Profile
    let { data: profile, error: profileErr } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .single();

    if (profileErr || !profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

    // Manual join for profile objective
    if (profile.current_objective_id) {
      const { data: objData } = await supabase.from('objectives').select('name').eq('id', profile.current_objective_id).single();
      profile.objectives = objData ? { name: objData.name } : null;
    }

    // 2. Fetch Shifts
    const operatorIds = [id];
    if (profile?.assigned_to) operatorIds.push(profile.assigned_to);

    let { data: shifts, error: shiftsErr } = await supabase
      .from('guard_shifts')
      .select('*')
      .in('operator_id', operatorIds)
      .order('checkin_time', { ascending: false })
      .limit(100);

    // Manual join for shifts objectives
    if (shifts && shifts.length > 0) {
      const objIds = [...new Set(shifts.map(s => s.objective_id).filter(Boolean))];
      const { data: objData } = await supabase.from('objectives').select('id, name').in('id', objIds);
      const objMap = Object.fromEntries(objData?.map(o => [o.id, o.name]) || []);
      shifts = shifts.map(s => ({ ...s, objectives: s.objective_id ? { name: objMap[s.objective_id] || 'Desconocido' } : null }));
    }

    return NextResponse.json({
      profile,
      shifts: shifts || []
    });
  } catch (error: any) {
    console.error("Error fetching employee details:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
