import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

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

    const userCookie = request.cookies.get('SIGPAD_user');
    if (!userCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let tenantId: string | null = null;
    let isSuper = false;
    let userId: string | null = null;

    try {
      const user = JSON.parse(decodeURIComponent(userCookie.value));
      userId = user?.id;
      tenantId = user?.tenant_id || user?.user_metadata?.tenant_id;
      isSuper = user?.role === 'superadmin' || user?.user_metadata?.role === 'superadmin';
    } catch {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    if (!tenantId && !isSuper && userId) {
      const supabase = createServiceClient();
      const { data: dbUser } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', userId)
        .maybeSingle();
      if (dbUser?.tenant_id) {
        tenantId = dbUser.tenant_id;
      }
    }

    if (!tenantId && !isSuper) {
      return NextResponse.json({ error: 'Inquilino no especificado' }, { status: 400 });
    }

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
    
    if (error && (error.message.includes('relationship') || error.message.includes('operator_id'))) {
      console.warn('[GUARD_BOOK_GET] operator_id relationship missing, falling back to resource_id join');
      
      let fallbackQuery = supabase
        .from('guard_book_entries')
        .select(`
          *,
          resources:resource_id ( id, name, avatar_url, role ),
          objectives:objective_id ( id, name, address )
        `)
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

      const fallbackResult = await fallbackQuery;
      if (fallbackResult.error) throw fallbackResult.error;
      data = fallbackResult.data;
    } else if (error) {
      throw error;
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
    const userCookie = request.cookies.get('SIGPAD_user');
    if (!userCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let tenantId: string | null = null;
    let isSuper = false;
    let userId: string | null = null;

    try {
      const user = JSON.parse(decodeURIComponent(userCookie.value));
      userId = user?.id;
      tenantId = user?.tenant_id || user?.user_metadata?.tenant_id;
      isSuper = user?.role === 'superadmin' || user?.user_metadata?.role === 'superadmin';
    } catch {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    if (!tenantId && !isSuper && userId) {
      const supabase = createServiceClient();
      const { data: dbUser } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', userId)
        .maybeSingle();
      if (dbUser?.tenant_id) {
        tenantId = dbUser.tenant_id;
      }
    }

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

    const targetTenantId = isSuper ? (body.tenant_id || tenantId) : tenantId;

    if (!targetTenantId) {
      return NextResponse.json({ error: 'tenant_id es requerido' }, { status: 400 });
    }

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
        tenant_id: targetTenantId
      })
      .select()
      .single();

    if (error) throw error;

    const responseData = data ? { ...data, resource_id: data.operator_id } : data;

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
        tenant_id: targetTenantId
      });
    }

    if (content?.startsWith('[GERENTE]') && objective_id) {
      try {
        const { data: activeGuards } = await supabase
          .from('resources')
          .select('id, assigned_to')
          .eq('current_objective_id', objective_id);

        if (activeGuards && activeGuards.length > 0) {
          const notificationsToInsert = activeGuards.map(g => ({
            resource_id: g.id,
            title: '📢 Novedad de Gerencia en Bitácora',
            body: content.replace('[GERENTE]', '').trim(),
            type: 'novedad',
            tenant_id: targetTenantId
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
