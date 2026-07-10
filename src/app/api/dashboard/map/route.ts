import { isConfigured } from '@/lib/supabase';
import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!isConfigured) {
      return NextResponse.json({
        objectives: [
          { id: 'OBJ-001', name: 'Puerto SIGPAD', address: 'Dique 1', latitude: -31.6450, longitude: -60.6950, status: 'Activo', is_manned: true },
          { id: 'OBJ-002', name: 'Consorcio Portofino', address: 'Costanera Este', latitude: -31.6280, longitude: -60.6750, status: 'Activo', is_manned: false },
        ],
        resources: [
          { id: 'S-701', name: 'NICO ESPINOSA', role: 'Gerente', current_objective_id: 'OBJ-001', status: 'activo', latitude: -31.640, longitude: -60.700 },
        ],
        recentIncidents: [],
        activeShifts: []
      }, {
        headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate' }
      });
    }

    const userCookie = req.cookies.get('SIGPAD_user');
    if (!userCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let tenantId: string | null = null;
    let isSuper = false;

    try {
      const user = JSON.parse(decodeURIComponent(userCookie.value));
      tenantId = user?.tenant_id || user?.user_metadata?.tenant_id;
      isSuper = user?.role === 'superadmin' || user?.user_metadata?.role === 'superadmin';
    } catch {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    if (!tenantId && !isSuper) {
      return NextResponse.json({ error: 'Inquilino no especificado' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Auto-generate alerts for unassigned shifts in the next 24 hours
    try {
      const now = new Date();
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      let unassignedQuery = supabase
        .from('shift_requirements')
        .select('id, objective_id, start_time, objectives:objective_id(name)')
        .eq('status', 'unassigned')
        .lte('start_time', next24h.toISOString())
        .gt('start_time', now.toISOString());

      if (!isSuper && tenantId) {
        unassignedQuery = unassignedQuery.eq('tenant_id', tenantId);
      }

      const { data: unassignedReqs } = await unassignedQuery;

      if (unassignedReqs && unassignedReqs.length > 0) {
        for (const req of unassignedReqs) {
          let alarmCheck = supabase
            .from('alarms')
            .select('id')
            .eq('objective_id', req.objective_id)
            .eq('alarm_type', 'cobertura_pendiente')
            .eq('status', 'active')
            .limit(1);

          if (!isSuper && tenantId) {
            alarmCheck = alarmCheck.eq('tenant_id', tenantId);
          }

          const { data: existingAlarm } = await alarmCheck;

          if (!existingAlarm || existingAlarm.length === 0) {
            const formattedTime = new Date(req.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            await supabase.from('alarms').insert({
              triggered_by: 'system_scheduler',
              objective_id: req.objective_id,
              alarm_type: 'cobertura_pendiente',
              message: `🚨 ALERTA COBERTURA: Falta asignar personal para el turno de las ${formattedTime} hs en ${req.objectives?.name || 'objetivo'}`,
              status: 'active',
              tenant_id: tenantId // inject tenant ID for the alarm
            });
          }
        }
      }
    } catch (e) {
      console.error('[AUTO_ALERT_SCHEDULER_ERROR]', e);
    }

    // Set up parallel fetch queries
    let objectivesQuery = supabase.from('objectives')
      .select('*, assigned_personnel:resources!current_objective_id(*)')
      .eq('is_active', true);

    let resourcesQuery = supabase.from('resources')
      .select('*')
      .in('status', ['activo', 'active'])
      .gte('last_gps_update', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString());

    let guardBookQuery = supabase.from('guard_book_entries')
      .select('*')
      .neq('status', 'resolved')
      .neq('status', 'resuelto')
      .neq('entry_type', 'fichaje')
      .order('created_at', { ascending: false })
      .limit(10);

    let shiftsQuery = supabase.from('guard_shifts')
      .select('id, checkin_time, operator_id, objective_id, status')
      .is('checkout_time', null)
      .order('checkin_time', { ascending: false });

    let incidentsQuery = supabase.from('incidents')
      .select('*')
      .neq('status', 'resolved')
      .neq('status', 'resuelto')
      .order('created_at', { ascending: false })
      .limit(10);

    // Apply tenant filters if not superadmin
    if (!isSuper && tenantId) {
      objectivesQuery = objectivesQuery.eq('tenant_id', tenantId);
      resourcesQuery = resourcesQuery.eq('tenant_id', tenantId);
      guardBookQuery = guardBookQuery.eq('tenant_id', tenantId);
      shiftsQuery = shiftsQuery.eq('tenant_id', tenantId);
      incidentsQuery = incidentsQuery.eq('tenant_id', tenantId);
    }

    const [objectivesRes, resourcesRes, incidentsRes, shiftsRes, rawIncidentsRes] = await Promise.all([
      objectivesQuery,
      resourcesQuery,
      guardBookQuery,
      shiftsQuery,
      incidentsQuery
    ]);

    if (objectivesRes.error) console.error("❌ Objectives fetch error:", JSON.stringify(objectivesRes.error));
    if (resourcesRes.error) console.error("❌ Resources fetch error:", JSON.stringify(resourcesRes.error));
    if (incidentsRes.error) console.error("❌ Guard book incidents fetch error:", JSON.stringify(incidentsRes.error));
    if (shiftsRes.error) console.error("❌ Shifts fetch error:", JSON.stringify(shiftsRes.error));
    if (rawIncidentsRes.error) console.error("❌ Raw incidents fetch error:", JSON.stringify(rawIncidentsRes.error));

    // Consolidate entries from both tables
    const recentIncidentsFromGuardBook = (incidentsRes.data || []).map((inc: any) => ({
      ...inc,
      resource_id: inc.operator_id || inc.resource_id
    }));

    const recentIncidentsFromRawIncidents = (rawIncidentsRes.data || []).map((inc: any) => ({
      ...inc,
      resource_id: inc.operator_id || inc.resource_id,
      urgency: inc.status === 'critica' || inc.status === 'crítica' ? 'critica' : 'normal'
    }));

    const recentIncidents = [...recentIncidentsFromGuardBook, ...recentIncidentsFromRawIncidents]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 15);

    return NextResponse.json({
      objectives: objectivesRes.data || [],
      resources: resourcesRes.data || [],
      recentIncidents,
      activeShifts: shiftsRes.data || []
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error("Dashboard API overall error:", error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error.message 
    }, { status: 500 });
  }
}
