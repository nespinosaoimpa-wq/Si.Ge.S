import { isConfigured } from '@/lib/supabase';
import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { serverCache } from '@/lib/cache';
import { resolveTenantFromRequest, MASTER_TENANT_ID } from '@/lib/resolve-tenant';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await resolveTenantFromRequest(req);
    if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { tenantId, isSuper, userId } = ctx;
    
    if (!isSuper && !tenantId) return NextResponse.json({ error: 'Tu sesión no tiene empresa asignada.' }, { status: 403 });

    // 🚀 CACHE CHECK: Evitar hit a DB si fue consultado en los últimos 10 segundos
    // Con Vercel Free (10s max), el caché de 10s divide por 10 el consumo de invocaciones
    const cacheKey = `dashboard-map-${isSuper ? 'super' : tenantId}`;
    const cachedData = serverCache.get(cacheKey, 10000); // 10 seconds TTL
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=10'
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
        const objIds = Array.from(new Set(unassignedReqs.map((r: any) => r.objective_id).filter(Boolean)));
        let alarmCheck = supabase
          .from('alarms')
          .select('objective_id')
          .in('objective_id', objIds)
          .eq('alarm_type', 'cobertura_pendiente')
          .eq('status', 'active');

        if (!isSuper && tenantId) {
          alarmCheck = alarmCheck.eq('tenant_id', tenantId);
        }

        const { data: existingAlarms } = await alarmCheck;
        const existingObjIds = new Set((existingAlarms || []).map((a: any) => a.objective_id));

        const alarmsToInsert = unassignedReqs
          .filter((req: any) => !existingObjIds.has(req.objective_id))
          .map((req: any) => {
            const formattedTime = new Date(req.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return {
              triggered_by: 'system_scheduler',
              objective_id: req.objective_id,
              alarm_type: 'cobertura_pendiente',
              message: `🚨 ALERTA COBERTURA: Falta asignar personal para el turno de las ${formattedTime} hs en ${req.objectives?.name || 'objetivo'}`,
              status: 'active',
              tenant_id: tenantId
            };
          });

        if (alarmsToInsert.length > 0) {
          await supabase.from('alarms').insert(alarmsToInsert);
        }
      }
    } catch (e) {
      console.error('[AUTO_ALERT_SCHEDULER_ERROR]', e);
    }

    // Fetch queries: for gerente/owner/superadmin, fetch all active objectives cleanly without PostgREST syntax issues
    // Fetch objectives first so we can use objective IDs to catch any alerts for this tenant
    let objectivesQuery = supabase.from('objectives').select('*');
    if (!isSuper && tenantId) {
      objectivesQuery = objectivesQuery.eq('tenant_id', tenantId);
    }
    const objectivesRes = await objectivesQuery;
    const rawObjectives = (objectivesRes.data || []).filter((o: any) => 
      o.is_active !== false && 
      o.status !== 'Inactivo' && 
      o.status !== 'inactivo' && 
      !o.deleted_at
    );
    const tenantObjectiveIds = rawObjectives.map((o: any) => o.id).filter(Boolean);

    let resourcesQuery = supabase.from('resources')
      .select('*, profiles:profile_id(avatar_url, full_name)')
      .neq('status', 'baja')
      .neq('status', 'inactivo');

    const last24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    let guardBookQuery = supabase.from('guard_book_entries')
      .select('*')
      .gte('created_at', last24h)
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
      .gte('created_at', last24h)
      .neq('status', 'resolved')
      .neq('status', 'resuelto')
      .neq('status', 'justificado')
      .neq('status', 'sancionado')
      .neq('status', 'atendido')
      .order('created_at', { ascending: false })
      .limit(10);

    let alarmsQuery = supabase.from('alarms')
      .select('*')
      .gte('created_at', last24h)
      .neq('status', 'resolved')
      .neq('status', 'resuelto')
      .neq('status', 'acknowledged')
      .order('created_at', { ascending: false })
      .limit(10);

    // Apply tenant filter with objective fallback
    if (!isSuper && tenantId) {
      resourcesQuery = resourcesQuery.eq('tenant_id', tenantId);
      shiftsQuery = shiftsQuery.eq('tenant_id', tenantId);

      if (tenantObjectiveIds.length > 0) {
        const idListStr = tenantObjectiveIds.map(id => `"${id}"`).join(',');
        guardBookQuery = guardBookQuery.or(`tenant_id.eq.${tenantId},objective_id.in.(${idListStr})`);
        incidentsQuery = incidentsQuery.or(`tenant_id.eq.${tenantId},objective_id.in.(${idListStr})`);
        alarmsQuery = alarmsQuery.or(`tenant_id.eq.${tenantId},objective_id.in.(${idListStr})`);
      } else {
        guardBookQuery = guardBookQuery.eq('tenant_id', tenantId);
        incidentsQuery = incidentsQuery.eq('tenant_id', tenantId);
        alarmsQuery = alarmsQuery.eq('tenant_id', tenantId);
      }
    }

    const [resourcesRes, incidentsRes, shiftsRes, rawIncidentsRes, alarmsRes] = await Promise.all([
      resourcesQuery,
      guardBookQuery,
      shiftsQuery,
      incidentsQuery,
      alarmsQuery
    ]);

    if (objectivesRes.error) console.error("❌ Objectives fetch error:", JSON.stringify(objectivesRes.error));
    if (incidentsRes.error) console.error("❌ Guard book incidents fetch error:", JSON.stringify(incidentsRes.error));
    if (shiftsRes.error) console.error("❌ Shifts fetch error:", JSON.stringify(shiftsRes.error));
    if (rawIncidentsRes.error) console.error("❌ Raw incidents fetch error:", JSON.stringify(rawIncidentsRes.error));
    if (alarmsRes?.error) console.error("❌ Alarms fetch error:", JSON.stringify(alarmsRes.error));

    let rawResources = resourcesRes.data || [];
    if (resourcesRes.error) {
      console.error("❌ Resources fetch error:", JSON.stringify(resourcesRes.error));
      let fallbackQuery = supabase.from('resources').select('*').neq('status', 'baja').neq('status', 'inactivo');
      if (!isSuper && tenantId) fallbackQuery = fallbackQuery.eq('tenant_id', tenantId);
      const fb = await fallbackQuery;
      rawResources = fb.data || [];
    }

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
      let latitude = alarm.latitude || alarm.operator_latitude;
      let longitude = alarm.longitude || alarm.operator_longitude;
      
      const obj = rawObjectives.find((o: any) => o.id === alarm.objective_id || o.id === resourceObjectiveMap[alarm.operator_id || alarm.triggered_by]);
      if (obj) {
        latitude = obj.latitude;
        longitude = obj.longitude;
      }

      const rawInc = {
        ...alarm,
        latitude,
        longitude,
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
      .filter((inc) => {
        const status = (inc.status || '').toLowerCase();
        return status !== 'resolved' && status !== 'resuelto' && status !== 'justificado' && status !== 'sancionado' && status !== 'atendido' && status !== 'acknowledged';
      })
      .filter((inc, index, self) => self.findIndex(t => 
        t.id === inc.id || 
        (t.objective_id && t.objective_id === inc.objective_id && t.entry_type === inc.entry_type && Math.abs(new Date(t.created_at).getTime() - new Date(inc.created_at).getTime()) < 120000)
      ) === index)
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
