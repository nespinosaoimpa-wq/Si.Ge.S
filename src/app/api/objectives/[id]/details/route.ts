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
        objective: { id, name: 'OBJETIVO MOCK', address: 'Calle Ficticia 123', status: 'Activo' },
        shifts: [],
        patrolRounds: [],
        checkpoints: [],
        inventory: [],
        guardBook: []
      });
    }

    const supabase = createServiceClient();

    // Parallel fetch using service role to bypass RLS
    const [objectiveRes, shiftsRes, patrolRoundsRes, routesRes, inventoryRes, guardBookRes] = await Promise.all([
      supabase.from('objectives').select('*').eq('id', id).single(),
      supabase.from('guard_shifts').select('*').eq('objective_id', id).order('checkin_time', { ascending: false }).limit(50),
      supabase.from('patrol_rounds').select('*').eq('objective_id', id).order('start_time', { ascending: false }).limit(20),
      supabase.from('patrol_routes').select('id').eq('objective_id', id),
      supabase.from('resource_inventory').select('*').eq('objective_id', id),
      supabase.from('guard_book_entries').select('*').eq('objective_id', id).order('created_at', { ascending: false }).limit(30)
    ]);

    if (objectiveRes.error || !objectiveRes.data) {
      return NextResponse.json({ error: 'Objetivo no encontrado' }, { status: 404 });
    }

    // Collect all operator IDs for manual join
    const operatorIds = new Set([
      ...(shiftsRes.data || []).map((s: any) => s.operator_id),
      ...(patrolRoundsRes.data || []).map((r: any) => r.operator_id || r.resource_id),
      ...(guardBookRes.data || []).map((g: any) => g.operator_id || g.resource_id)
    ].filter(Boolean));

    const { data: resData } = await supabase.from('resources').select('id, name, avatar_url').in('id', Array.from(operatorIds));
    const resMap = Object.fromEntries(resData?.map(r => [r.id, { name: r.name, avatar: r.avatar_url }]) || []);

    const shifts = (shiftsRes.data || []).map((s: any) => ({
      ...s,
      operator_name: resMap[s.operator_id]?.name || s.operator_id,
      operator_avatar: resMap[s.operator_id]?.avatar || null
    }));

    const patrolRounds = (patrolRoundsRes.data || []).map((r: any) => ({
      ...r,
      resources: { name: resMap[r.operator_id || r.resource_id]?.name || 'Desconocido' }
    }));

    const guardBook = (guardBookRes.data || []).map((g: any) => {
      const opId = g.operator_id || g.resource_id;
      return {
        ...g,
        resource_id: opId,
        resource_name: resMap[opId]?.name || opId,
        resources: { name: resMap[opId]?.name || 'Desconocido', avatar_url: resMap[opId]?.avatar }
      };
    });

    // If there are routes, fetch checkpoints
    let checkpoints: any[] = [];
    const routeIds = routesRes.data?.map(r => r.id) || [];
    if (routeIds.length > 0) {
      const { data } = await supabase
        .from('patrol_checkpoints')
        .select('*')
        .in('route_id', routeIds)
        .order('sequence_order', { ascending: true });
      checkpoints = data || [];
    }

    return NextResponse.json({
      objective: objectiveRes.data,
      shifts,
      patrolRounds,
      checkpoints,
      inventory: inventoryRes.data || [],
      guardBook
    });
  } catch (error: any) {
    console.error("Error fetching objective details:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
