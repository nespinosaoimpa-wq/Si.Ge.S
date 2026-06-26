import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/guard-book?objective_id=X&date=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const objectiveId = searchParams.get('objective_id');
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '100');

    const supabase = createServiceClient();

    let query = supabase
      .from('guard_book_entries')
      .select(`
        *,
        resources:operator_id ( id, name, avatar_url, role ),
        objectives:objective_id ( id, name, address )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (objectiveId) query = query.eq('objective_id', objectiveId);
    if (date) {
      query = query
        .gte('created_at', `${date}T00:00:00.000Z`)
        .lte('created_at', `${date}T23:59:59.999Z`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const entries = data || [];

    // ── Tarea 1: Calcular abandon_duration_seconds ──────────────────────────
    // Para cada entrada tipo 'incidente' (abandono), buscar el evento de
    // reingreso más cercano posterior del mismo operator_id + objective_id.
    const enriched = entries.map(entry => {
      // Map operator_id to resource_id for frontend compatibility
      const legacyEntry = {
        ...entry,
        resource_id: entry.operator_id
      };

      if (legacyEntry.entry_type !== 'incidente') return legacyEntry;

      const abandonTs = new Date(legacyEntry.created_at).getTime();

      // Buscar el evento de retorno más próximo posterior
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

      return legacyEntry; // sin reingreso aún → duración null
    });

    // ── Tarea 2: Geocodificación Inversa (RPC point-in-polygon) ─────────────
    const withZones = await Promise.all(enriched.map(async (entry) => {
      if (!entry.latitude || !entry.longitude) return { ...entry, tactical_zone: null };
      try {
        const { data: zone } = await supabase.rpc('get_zone_name', {
          p_lat: parseFloat(entry.latitude),
          p_lng: parseFloat(entry.longitude),
          p_objective_id: entry.objective_id
        });
        return { ...entry, tactical_zone: zone };
      } catch (e) {
        return { ...entry, tactical_zone: 'Perímetro General' };
      }
    }));

    // ── Tarea 3: Reincidencia de Operadores (últimos 7 días) ────────────────
    const resourceIds = [...new Set(withZones.map(e => e.resource_id).filter(Boolean))];
    const weeklyAlertCounts: Record<string, number> = {};

    if (resourceIds.length > 0) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: alerts } = await supabase
        .from('guard_book_entries')
        .select('operator_id')
        .in('operator_id', resourceIds)
        .gte('created_at', sevenDaysAgo.toISOString())
        .or('urgency.eq.critica,entry_type.eq.emergencia');
        
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
export async function POST(request: Request) {
  try {
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

    // Validate FKs exist before inserting to avoid silent failures
    if (!objective_id || objective_id === 'objetivo_demo') {
      return NextResponse.json({ error: 'objective_id inválido o faltante' }, { status: 400 });
    }
    if (!rawResourceId || rawResourceId === 'recurso_demo') {
      return NextResponse.json({ error: 'resource_id inválido o faltante' }, { status: 400 });
    }

    // RESOLVE: If rawResourceId is a UUID, find the actual resource.id
    let resource_id = rawResourceId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawResourceId);
    
    if (isUUID) {
      const { data: res } = await supabase
        .from('resources')
        .select('id')
        .or(`id.eq.${rawResourceId},assigned_to.eq.${rawResourceId}`)
        .maybeSingle();
      if (res?.id) resource_id = res.id;
    } else {
      resource_id = rawResourceId;
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
      })
      .select()
      .single();

    if (error) throw error;

    // Map operator_id to resource_id in the returned data for frontend compatibility
    const responseData = data ? { ...data, resource_id: data.operator_id } : data;

    // If critical alarm, insert into alarms table for push notification to ALL managers
    if (urgency === 'critica' || entry_type === 'emergencia') {
      let operatorName = resource_id;
      let objectiveName = '';
      try {
        const { data: resData } = await supabase.from('resources').select('name').eq('id', resource_id).maybeSingle();
        if (resData?.name) operatorName = resData.name;
        const { data: objData } = await supabase.from('objectives').select('name').eq('id', objective_id).maybeSingle();
        if (objData?.name) objectiveName = objData.name;
      } catch (e) {}

      await supabase.from('alarms').insert({
        triggered_by: resource_id,
        objective_id,
        alarm_type: entry_type === 'emergencia' ? 'panico' : (entry_type || 'panico'),
        message: content,
        latitude,
        longitude,
        status: 'active',
        operator_name: operatorName,
        operator_latitude: latitude,
        operator_longitude: longitude,
        objective_name: objectiveName,
      });
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('[GUARD_BOOK_POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

