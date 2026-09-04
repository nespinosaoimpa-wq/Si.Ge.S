import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantFromRequest } from '@/lib/resolve-tenant';

// GET /api/guard-book?objective_id=X&date=YYYY-MM-DD&start_date=X&end_date=Y&urgency=X&entry_type=Y
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const objectiveId = searchParams.get('objective_id');
    const date = searchParams.get('date');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const urgency = searchParams.get('urgency');
    const entryType = searchParams.get('entry_type');
    const limit = parseInt(searchParams.get('limit') || '300');

    const ctx = await resolveTenantFromRequest(request);
    let tenantId = ctx?.tenantId || null;
    let isSuper = ctx?.isSuper || false;

    const supabase = createServiceClient();

    // Fallback: if tenantId is missing, resolve from objectiveId
    if (!tenantId && !isSuper && objectiveId && objectiveId !== 'all') {
      const { data: obj } = await supabase.from('objectives').select('tenant_id').eq('id', objectiveId).maybeSingle();
      if (obj?.tenant_id) tenantId = obj.tenant_id;
    }

    if (!tenantId && !isSuper) {
      tenantId = '7f1fd036-6a82-47ab-aa2a-964c081e285b';
    }

    let query = supabase
      .from('guard_book_entries')
      .select(`
        *,
        resources:operator_id ( id, name, avatar_url, role ),
        objectives:objective_id ( id, name, address )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!isSuper && tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    if (objectiveId && objectiveId !== 'all') query = query.eq('objective_id', objectiveId);
    if (urgency && urgency !== 'all') query = query.eq('urgency', urgency);
    if (entryType && entryType !== 'all') query = query.eq('entry_type', entryType);

    if (date && date !== 'all') {
      query = query
        .gte('created_at', `${date}T00:00:00.000Z`)
        .lte('created_at', `${date}T23:59:59.999Z`);
    } else if (startDate || endDate) {
      if (startDate) query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
      if (endDate) query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
    }

    let { data, error } = await query;
    
    if (error) {
      console.warn('[GUARD_BOOK_GET] Join error, falling back to simple select:', error.message);
      
      let fallbackQuery = supabase
        .from('guard_book_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!isSuper && tenantId) fallbackQuery = fallbackQuery.eq('tenant_id', tenantId);
      if (objectiveId && objectiveId !== 'all') fallbackQuery = fallbackQuery.eq('objective_id', objectiveId);
      if (urgency && urgency !== 'all') fallbackQuery = fallbackQuery.eq('urgency', urgency);
      if (entryType && entryType !== 'all') fallbackQuery = fallbackQuery.eq('entry_type', entryType);

      if (date && date !== 'all') {
        fallbackQuery = fallbackQuery
          .gte('created_at', `${date}T00:00:00.000Z`)
          .lte('created_at', `${date}T23:59:59.999Z`);
      } else if (startDate || endDate) {
        if (startDate) fallbackQuery = fallbackQuery.gte('created_at', `${startDate}T00:00:00.000Z`);
        if (endDate) fallbackQuery = fallbackQuery.lte('created_at', `${endDate}T23:59:59.999Z`);
      }

      const fb = await fallbackQuery;
      data = fb.data;
    }

    const entries = data || [];

    // Calcular abandono en incidentes
    const enriched = entries.map(entry => {
      const legacyEntry = {
        ...entry,
        resource_id: entry.operator_id
      };

      if (legacyEntry.entry_type !== 'incidente') return legacyEntry;

      const abandonTs = new Date(legacyEntry.created_at).getTime();

      const reentryEvent = entries.find(e =>
        (e.operator_id || e.resource_id) === legacyEntry.resource_id &&
        e.objective_id === legacyEntry.objective_id &&
        new Date(e.created_at).getTime() > abandonTs &&
        (
          e.entry_type === 'fichaje' ||
          (e.entry_type === 'incidente' && (e.content || '').toLowerCase().includes('reingres'))
        )
      );

      if (reentryEvent) {
        const reentryTs = new Date(reentryEvent.created_at).getTime();
        return {
          ...legacyEntry,
          abandon_duration_seconds: Math.round((reentryTs - abandonTs) / 1000),
        };
      }

      return legacyEntry;
    });

    const withZones = enriched.map((entry) => {
      if (!entry.latitude || !entry.longitude) {
        return { ...entry, tactical_zone: null };
      }
      const objectiveName = (entry.objectives as any)?.name || null;
      return {
        ...entry,
        tactical_zone: objectiveName || 'Perímetro General',
      };
    });

    const resourceIds = [...new Set(withZones.map(e => e.resource_id).filter(Boolean))];
    const weeklyAlertCounts: Record<string, number> = {};

    if (resourceIds.length > 0) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      let alertQuery = supabase
        .from('guard_book_entries')
        .select('operator_id')
        .in('operator_id', resourceIds)
        .gte('created_at', sevenDaysAgo.toISOString())
        .or('urgency.eq.critica,entry_type.eq.emergencia');

      if (!isSuper && tenantId) {
        alertQuery = alertQuery.eq('tenant_id', tenantId);
      }
        
      const { data: alerts } = await alertQuery;
        
      if (alerts) {
        alerts.forEach(a => {
          weeklyAlertCounts[a.operator_id] = (weeklyAlertCounts[a.operator_id] || 0) + 1;
        });
      }
    }

    const finalEntries = withZones.map(e => ({
      ...e,
      weekly_alert_count: weeklyAlertCounts[e.resource_id] || 0
    }));

    return NextResponse.json(finalEntries);
  } catch (error: any) {
    console.error('[GUARD_BOOK_GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/guard-book — insert a new entry
export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveTenantFromRequest(request);
    let tenantId = ctx?.tenantId || null;
    let isSuper = ctx?.isSuper || false;
    let userId = ctx?.userId || null;

    const body = await request.json();
    const supabase = createServiceClient();

    const {
      objective_id,
      resource_id: rawResourceId,
      entry_type,
      content,
      latitude,
      longitude,
      urgency = 'normal',
      image_url = null,
      audio_url = null,
    } = body;

    if (!objective_id || objective_id === 'objetivo_demo') {
      return NextResponse.json({ error: 'objective_id inválido o faltante' }, { status: 400 });
    }
    if (!rawResourceId || rawResourceId === 'recurso_demo') {
      return NextResponse.json({ error: 'resource_id inválido o faltante' }, { status: 400 });
    }

    let targetTenantId = isSuper ? (body.tenant_id || tenantId) : tenantId;

    if (!targetTenantId) {
      if (objective_id) {
        const { data: objData } = await supabase
          .from('objectives')
          .select('tenant_id')
          .eq('id', objective_id)
          .maybeSingle();
        if (objData?.tenant_id) targetTenantId = objData.tenant_id;
      }
      if (!targetTenantId && rawResourceId) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawResourceId);
        let resQuery = supabase.from('resources').select('tenant_id');
        if (isUUID) {
          resQuery = resQuery.or(`id.eq.${rawResourceId},assigned_to.eq.${rawResourceId}`);
        } else {
          resQuery = resQuery.eq('id', rawResourceId);
        }
        const { data: resData } = await resQuery.maybeSingle();
        if (resData?.tenant_id) targetTenantId = resData.tenant_id;
      }
    }

    if (!targetTenantId) {
      return NextResponse.json({ error: 'tenant_id es requerido' }, { status: 400 });
    }

    let resource_id = rawResourceId;
    if (rawResourceId === 'gerente_master' || rawResourceId === 'gerente' || !rawResourceId) {
      resource_id = userId || 'gerente';
    } else {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawResourceId);
      if (isUUID) {
        const { data: res } = await supabase
          .from('resources')
          .select('id')
          .or(`id.eq.${rawResourceId},assigned_to.eq.${rawResourceId}`)
          .maybeSingle();
        if (res?.id) resource_id = res.id;
      }
    }

    const { data, error } = await supabase
      .from('guard_book_entries')
      .insert({
        objective_id,
        operator_id: resource_id,
        entry_type,
        content,
        latitude,
        longitude,
        urgency,
        image_url,
        audio_url,
        created_at: new Date().toISOString(),
        tenant_id: targetTenantId
      })
      .select()
      .single();

    if (error) throw error;

    const responseData = data ? { ...data, resource_id: data.operator_id } : data;

    if (urgency === 'critica' || entry_type === 'emergencia') {
      let operatorName = resource_id;
      let objectiveName = '';
      let objLat = latitude;
      let objLng = longitude;
      try {
        const { data: resData } = await supabase
          .from('resources')
          .select('name')
          .or(`id.eq.${resource_id},assigned_to.eq.${resource_id}`)
          .maybeSingle();
        if (resData?.name) operatorName = resData.name;
        const { data: objData } = await supabase.from('objectives').select('name, latitude, longitude').eq('id', objective_id).maybeSingle();
        if (objData?.name) objectiveName = objData.name;
        // Use objective coordinates when operator GPS is missing/zero
        if ((!objLat || !objLng) && objData?.latitude) {
          objLat = objData.latitude;
          objLng = objData.longitude;
        }
      } catch (e) {}

      await supabase.from('alarms').insert({
        triggered_by: resource_id,
        objective_id,
        alarm_type: entry_type === 'emergencia' ? 'panico' : (entry_type || 'panico'),
        message: content,
        latitude: objLat,
        longitude: objLng,
        status: 'active',
        operator_name: operatorName,
        operator_latitude: latitude,
        operator_longitude: longitude,
        objective_name: objectiveName,
        tenant_id: targetTenantId
      });
    }

    // ════ TAMBIÉN INSERTAR EN INCIDENTS PARA APARECER EN MAPA GENERAL ════
    // Todas las novedades que no sean fichajes simples deben aparecer en el mapa
    if (entry_type !== 'fichaje') {
      try {
        let objLat = latitude;
        let objLng = longitude;
        if ((!objLat || !objLng || Number(objLat) === 0) && objective_id) {
          const { data: objCoords } = await supabase
            .from('objectives')
            .select('latitude, longitude')
            .eq('id', objective_id)
            .maybeSingle();
          if (objCoords?.latitude) {
            objLat = objCoords.latitude;
            objLng = objCoords.longitude;
          }
        }
        await supabase.from('incidents').insert({
          objective_id,
          operator_id: resource_id,
          tenant_id: targetTenantId,
          entry_type: entry_type || 'novedad',
          content,
          latitude: objLat,
          longitude: objLng,
          urgency: urgency || 'normal',
          status: 'abierto',
          image_url: image_url || null,
          audio_url: audio_url || null,
          created_at: new Date().toISOString()
        } as any);
      } catch (e) {
        // Non-blocking: guard_book_entry already saved
        console.warn('[GUARD_BOOK_POST] Could not mirror to incidents:', e);
      }
    }

    // ════ DISPARAR NOTIFICACIÓN INMEDIATA A LOS OPERADORES DEL OBJETIVO ════
    if (objective_id && (content?.startsWith('[GERENTE]') || body.is_manager || isSuper)) {
      try {
        const activeOperatorIds = new Set<string>();

        // 1. Operadores con turno activo en este objetivo
        const { data: activeShifts } = await supabase
          .from('guard_shifts')
          .select('operator_id')
          .eq('objective_id', objective_id)
          .in('status', ['activo', 'active']);

        if (activeShifts) {
          activeShifts.forEach(s => {
            if (s.operator_id) activeOperatorIds.add(s.operator_id);
          });
        }

        // 2. Operadores asignados directamente al objetivo
        const { data: objectiveGuards } = await supabase
          .from('resources')
          .select('id, assigned_to')
          .or(`current_objective_id.eq.${objective_id}`);

        if (objectiveGuards) {
          objectiveGuards.forEach(g => {
            if (g.id) activeOperatorIds.add(g.id);
            if (g.assigned_to) activeOperatorIds.add(g.assigned_to);
          });
        }

        if (activeOperatorIds.size > 0) {
          const cleanBody = content.replace('[GERENTE]', '').trim();
          const notificationsToInsert = Array.from(activeOperatorIds).map(opId => ({
            resource_id: opId,
            title: '📢 Novedad / Orden de Gerencia en Bitácora',
            body: cleanBody,
            type: 'novedad',
            tenant_id: targetTenantId,
            created_at: new Date().toISOString()
          }));
          await supabase.from('notifications').insert(notificationsToInsert);
        }
      } catch (e) {
        console.warn('[GUARD_BOOK_POST] Notice dispatch warning:', e);
      }
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('[GUARD_BOOK_POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
