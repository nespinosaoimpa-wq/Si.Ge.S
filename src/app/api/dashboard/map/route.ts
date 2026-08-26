import { isConfigured } from '@/lib/supabase';
import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { serverCache } from '@/lib/cache';

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
    let userId: string | null = null;

    let userEmail: string | null = null;
    try {
      const user = JSON.parse(decodeURIComponent(userCookie.value));
      userId = user?.id;
      userEmail = user?.email;
      tenantId = user?.tenant_id || user?.user_metadata?.tenant_id;
      const userRole = (user?.role || user?.user_metadata?.role || '').toLowerCase();
      // isSuper is ONLY true if explicitly in global superadmin mode
      isSuper = (userRole === 'superadmin') && (!tenantId || tenantId === 'a1b2c3d4-0001-0001-0001-000000000001');
    } catch {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    if (!tenantId && !isSuper && (userId || userEmail)) {
      try {
        const supabase = createServiceClient();
        if (userId) {
          const { data: dbUser } = await supabase.from('users').select('tenant_id').eq('id', userId).maybeSingle();
          if (dbUser?.tenant_id) tenantId = dbUser.tenant_id;
        }
        if (!tenantId && userEmail) {
          const { data: authU } = await supabase.from('authorized_users').select('tenant_id').ilike('email', userEmail).maybeSingle();
          if (authU?.tenant_id) tenantId = authU.tenant_id;
        }
        if (!tenantId && userEmail) {
          const { data: res } = await supabase.from('resources').select('tenant_id').ilike('email', userEmail).maybeSingle();
          if (res?.tenant_id) tenantId = res.tenant_id;
        }
        if (!tenantId && userEmail) {
          const { data: t } = await supabase.from('tenants').select('id').ilike('admin_email', userEmail).order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (t?.id) tenantId = t.id;
        }
      } catch {}
    }

    // 🚀 CACHE CHECK: Prevent DB hit if requested within 4 seconds
    const cacheKey = `dashboard-map-${isSuper ? 'super' : tenantId}`;
    const cachedData = serverCache.get(cacheKey, 4000); // 4 seconds TTL
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=4'
        }
      });
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
              tenant_id: tenantId
            });
          }
        }
      }
    } catch (e) {
      console.error('[AUTO_ALERT_SCHEDULER_ERROR]', e);
    }

    // Fetch queries: for gerente/owner/superadmin, fetch all active objectives cleanly without PostgREST syntax issues
    let objectivesQuery = supabase.from('objectives').select('*');

    let resourcesQuery = supabase.from('resources')
      .select('*')
      .neq('status', 'baja')
      .neq('status', 'inactivo');

    let guardBookQuery = supabase.from('guard_book_entries')
      .select('*')
      .neq('status', 'resolved')
      .neq('status', 'resuelto')
      .neq('status', 'justificado')
      .neq('status', 'sancionado')
      .neq('status', 'atendido')
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
      .neq('status', 'justificado')
      .neq('status', 'sancionado')
      .neq('status', 'atendido')
      .order('created_at', { ascending: false })
      .limit(10);

    let alarmsQuery = supabase.from('alarms')
      .select('*')
      .neq('status', 'resolved')
      .neq('status', 'resuelto')
      .neq('status', 'acknowledged')
      .order('created_at', { ascending: false })
      .limit(10);

    // Apply strict tenant filter for tenant managers
    if (!isSuper && tenantId) {
      if (tenantId === 'a1b2c3d4-0001-0001-0001-000000000001') {
        const tenantFilter = `tenant_id.eq.${tenantId},tenant_id.is.null`;
        objectivesQuery = objectivesQuery.or(tenantFilter);
        resourcesQuery = resourcesQuery.or(tenantFilter);
        guardBookQuery = guardBookQuery.or(tenantFilter);
        shiftsQuery = shiftsQuery.or(tenantFilter);
        incidentsQuery = incidentsQuery.or(tenantFilter);
        alarmsQuery = alarmsQuery.or(tenantFilter);
      } else {
        objectivesQuery = objectivesQuery.eq('tenant_id', tenantId);
        resourcesQuery = resourcesQuery.eq('tenant_id', tenantId);
        guardBookQuery = guardBookQuery.eq('tenant_id', tenantId);
        shiftsQuery = shiftsQuery.eq('tenant_id', tenantId);
        incidentsQuery = incidentsQuery.eq('tenant_id', tenantId);
        alarmsQuery = alarmsQuery.eq('tenant_id', tenantId);
      }
    }

    const [objectivesRes, resourcesRes, incidentsRes, shiftsRes, rawIncidentsRes, alarmsRes] = await Promise.all([
      objectivesQuery,
      resourcesQuery,
      guardBookQuery,
      shiftsQuery,
      incidentsQuery,
      alarmsQuery
    ]);

    if (objectivesRes.error) console.error("❌ Objectives fetch error:", JSON.stringify(objectivesRes.error));
    if (resourcesRes.error) console.error("❌ Resources fetch error:", JSON.stringify(resourcesRes.error));
    if (incidentsRes.error) console.error("❌ Guard book incidents fetch error:", JSON.stringify(incidentsRes.error));
    if (shiftsRes.error) console.error("❌ Shifts fetch error:", JSON.stringify(shiftsRes.error));
    if (rawIncidentsRes.error) console.error("❌ Raw incidents fetch error:", JSON.stringify(rawIncidentsRes.error));
    if (alarmsRes?.error) console.error("❌ Alarms fetch error:", JSON.stringify(alarmsRes.error));

    // Filter out inactive and deleted objectives
    const rawObjectives = (objectivesRes.data || []).filter((o: any) => 
      o.is_active !== false && 
      o.status !== 'Inactivo' && 
      o.status !== 'inactivo' && 
      !o.deleted_at
    );
    const rawResources = resourcesRes.data || [];

    // Map assigned personnel in memory cleanly
    const resourcesByObjective: Record<string, any[]> = {};
    rawResources.forEach((r: any) => {
      if (r.current_objective_id) {
        if (!resourcesByObjective[r.current_objective_id]) {
          resourcesByObjective[r.current_objective_id] = [];
        }
        resourcesByObjective[r.current_objective_id].push(r);
      }
    });

    const parseCoord = (val: any, fallback: number = 0) => {
      if (val === null || val === undefined || val === '') return fallback;
      const str = String(val).trim().replace(',', '.');
      const num = parseFloat(str);
      return isNaN(num) ? fallback : num;
    };

    const mappedObjectives = rawObjectives.map((obj: any) => ({
      ...obj,
      latitude: parseCoord(obj.latitude, -31.6107),
      longitude: parseCoord(obj.longitude, -60.6973),
      assigned_personnel: resourcesByObjective[obj.id] || []
    }));

    // Build lookup map for resolving missing coordinates from objectives
    const objectiveCoordMap: Record<string, { latitude: number; longitude: number }> = {};
    mappedObjectives.forEach((obj: any) => {
      if (obj.id && obj.latitude && obj.longitude) {
        objectiveCoordMap[obj.id] = { latitude: obj.latitude, longitude: obj.longitude };
      }
    });

    // Also build a lookup from resources → their current objective, for resolving operator incidents
    const resourceObjectiveMap: Record<string, string> = {};
    rawResources.forEach((r: any) => {
      if (r.id && r.current_objective_id) {
        resourceObjectiveMap[r.id] = r.current_objective_id;
      }
    });

    // Helper: resolve missing lat/lng from objective_id or operator's assigned objective
    const resolveCoords = (inc: any) => {
      let lat = inc.latitude;
      let lng = inc.longitude;
      const hasCoords = lat !== null && lat !== undefined && lng !== null && lng !== undefined && !isNaN(Number(lat)) && !isNaN(Number(lng)) && Number(lat) !== 0 && Number(lng) !== 0;

      if (!hasCoords) {
        // Try to resolve from objective_id
        const objId = inc.objective_id;
        if (objId && objectiveCoordMap[objId]) {
          lat = objectiveCoordMap[objId].latitude;
          lng = objectiveCoordMap[objId].longitude;
        }
      }

      if (!hasCoords && !lat) {
        // Try to resolve from the operator's assigned objective
        const resId = inc.resource_id || inc.operator_id;
        if (resId && resourceObjectiveMap[resId]) {
          const objId = resourceObjectiveMap[resId];
          if (objectiveCoordMap[objId]) {
            lat = objectiveCoordMap[objId].latitude;
            lng = objectiveCoordMap[objId].longitude;
          }
        }
      }

      return { latitude: lat, longitude: lng };
    };

    // Consolidate entries from all alert tables
    const recentIncidentsFromGuardBook = (incidentsRes.data || []).map((inc: any) => {
      const coords = resolveCoords(inc);
      return {
        ...inc,
        resource_id: inc.operator_id || inc.resource_id,
        latitude: coords.latitude,
        longitude: coords.longitude
      };
    });

    const recentIncidentsFromRawIncidents = (rawIncidentsRes.data || []).map((inc: any) => {
      const coords = resolveCoords(inc);
      return {
        ...inc,
        resource_id: inc.operator_id || inc.resource_id,
        urgency: inc.status === 'critica' || inc.status === 'crítica' ? 'critica' : 'normal',
        latitude: coords.latitude,
        longitude: coords.longitude
      };
    });

    const recentIncidentsFromAlarms = (alarmsRes?.data || []).map((alarm: any) => {
      const rawInc = {
        ...alarm,
        latitude: alarm.latitude || alarm.operator_latitude,
        longitude: alarm.longitude || alarm.operator_longitude,
        resource_id: alarm.operator_id || alarm.triggered_by
      };
      const coords = resolveCoords(rawInc);
      return {
        id: alarm.id,
        objective_id: alarm.objective_id,
        entry_type: alarm.alarm_type === 'panico' || alarm.alarm_type === 'sos_panic' ? 'panic' : 'emergencia',
        content: `🚨 ALERTA: ${alarm.message || alarm.alarm_type || 'Pánico en puesto'}`,
        latitude: coords.latitude,
        longitude: coords.longitude,
        created_at: alarm.created_at,
        urgency: 'critica',
        status: alarm.status,
        resource_name: alarm.operator_name || 'Operador',
        resource_id: alarm.operator_id || alarm.triggered_by
      };
    });

    const recentIncidents = [
      ...recentIncidentsFromGuardBook, 
      ...recentIncidentsFromRawIncidents,
      ...recentIncidentsFromAlarms
    ]
      .filter((inc, index, self) => self.findIndex(t => t.id === inc.id) === index)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);

    const responseData = {
      objectives: mappedObjectives,
      resources: rawResources,
      recentIncidents,
      activeShifts: shiftsRes.data || []
    };

    return NextResponse.json(responseData, {
      headers: {
        'X-Cache': 'MISS',
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
