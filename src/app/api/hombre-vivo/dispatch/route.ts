import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { sendPushToUser } from '@/lib/web-push-config';
import { resolveTenantFromRequest } from '@/lib/resolve-tenant';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await resolveTenantFromRequest(req);
    const tenantId = ctx?.tenantId;
    const effectiveTenantId = tenantId || '7f1fd036-6a82-47ab-aa2a-964c081e285b';

    const supabase = createServiceClient();

    const showAll = req.nextUrl.searchParams.get('all') === 'true';

    let resQuery = supabase.from('resources')
      .select('*')
      .neq('status', 'baja')
      .neq('status', 'inactivo');
    let objQuery = supabase.from('objectives').select('id, name');
    let shiftsQuery = supabase.from('guard_shifts')
      .select('operator_id, objective_id')
      .in('status', ['activo', 'active']);
    let bookQuery = supabase.from('guard_book_entries')
      .select('*')
      .or('entry_type.eq.hombre_vivo,entry_type.eq.hombre_vivo_sin_respuesta,content.ilike.%hombre vivo%')
      .order('created_at', { ascending: false })
      .limit(100);
    let alarmsQuery = supabase.from('alarms')
      .select('*')
      .or('alarm_type.eq.hombre_vivo,alarm_type.eq.hombre_vivo_sin_respuesta,alarm_type.eq.hombre_vivo_solicitud,message.ilike.%hombre vivo%')
      .order('created_at', { ascending: false })
      .limit(100);

    if (effectiveTenantId && (!ctx?.isSuper || !showAll)) {
      resQuery = resQuery.eq('tenant_id', effectiveTenantId);
      objQuery = objQuery.eq('tenant_id', effectiveTenantId);
      shiftsQuery = shiftsQuery.eq('tenant_id', effectiveTenantId);
      bookQuery = bookQuery.eq('tenant_id', effectiveTenantId);
      alarmsQuery = alarmsQuery.eq('tenant_id', effectiveTenantId);
    }

    const [resourcesRes, objectivesRes, shiftsRes, bookRes, alarmsRes] = await Promise.all([
      resQuery,
      objQuery,
      shiftsQuery,
      bookQuery,
      alarmsQuery
    ]);

    const objMap: Record<string, string> = {};
    (objectivesRes.data || []).forEach((o: any) => {
      objMap[o.id] = o.name;
    });

    const activeShiftMap: Record<string, string> = {};
    (shiftsRes.data || []).forEach((s: any) => {
      if (s.operator_id) activeShiftMap[s.operator_id] = s.objective_id;
    });

    const seenKeys = new Set<string>();
    const activeGuards: any[] = [];

    (resourcesRes.data || []).forEach((r: any) => {
      const shiftObjId = activeShiftMap[r.id] || activeShiftMap[r.assigned_to];
      const isOnShift = Boolean(shiftObjId);

      const key = (r.dni || r.email || r.name || '').toLowerCase().trim();
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      const objId = shiftObjId || r.current_objective_id;
      const objName = objId ? (objMap[objId] || 'Puesto Activo') : 'Puesto Activo';

      activeGuards.push({
        id: r.id,
        name: r.name,
        avatar_url: r.avatar_url,
        role: r.role,
        isOnShift,
        current_objective_id: objId,
        objective_name: objName
      });
    });

    // Sort: Guards on active shifts first
    activeGuards.sort((a, b) => (b.isOnShift ? 1 : 0) - (a.isOnShift ? 1 : 0));

    const resMap: Record<string, any> = {};
    (resourcesRes.data || []).forEach((r: any) => {
      resMap[r.id] = r;
    });

    const combined: any[] = [];

    (alarmsRes.data || []).forEach((a: any) => {
      const elapsedMins = Math.floor((Date.now() - new Date(a.created_at).getTime()) / (1000 * 60));
      const opId = a.operator_id || a.triggered_by;
      const opName = a.operator_name || resMap[opId]?.name || 'Operador';
      
      const isAcknowledged = a.status === 'acknowledged';
      const isResolved = a.status === 'resolved' || a.status === 'resuelto';
      const isUnanswered = a.status === 'active' || a.alarm_type === 'hombre_vivo_sin_respuesta';

      combined.push({
        id: a.id,
        created_at: a.created_at,
        operator_id: opId,
        operator_name: opName,
        objective_id: a.objective_id,
        objective_name: a.objective_id ? objMap[a.objective_id] || 'Puesto Asignado' : 'Puesto Asignado',
        status: isResolved ? 'resuelto' : (isAcknowledged ? 'respondido' : 'sin_responder'),
        time_elapsed_minutes: elapsedMins,
        latitude: a.latitude || a.operator_latitude,
        longitude: a.longitude || a.operator_longitude,
        notes: a.message,
        urgency: isUnanswered ? 'critica' : 'normal'
      });
    });

    (bookRes.data || []).forEach((e: any) => {
      // Only add guard book entries if not already represented by an alarm record
      if (!combined.some(c => c.id === e.id || c.created_at === e.created_at)) {
        const isAnswered = (e.content || '').includes('RESPONDIDO OK') || (e.content || '').includes('PRESENCIA CONFIRMADA');
        const isResolved = e.status === 'resolved' || e.status === 'resuelto';
        const elapsedMins = Math.floor((Date.now() - new Date(e.created_at).getTime()) / (1000 * 60));
        const opId = e.operator_id || e.resource_id;
        const opName = resMap[opId]?.name || 'Operador en Guardia';

        combined.push({
          id: e.id,
          created_at: e.created_at,
          operator_id: opId,
          operator_name: opName,
          operator_avatar: resMap[opId]?.avatar_url,
          objective_id: e.objective_id,
          objective_name: e.objective_id ? objMap[e.objective_id] || 'Puesto Asignado' : 'Puesto Asignado',
          status: isResolved ? 'resuelto' : (isAnswered ? 'respondido' : 'sin_responder'),
          time_elapsed_minutes: elapsedMins,
          latitude: e.latitude,
          longitude: e.longitude,
          notes: e.content,
          urgency: e.urgency
        });
      }
    });

    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ activeGuards, checks: combined });
  } catch (error: any) {
    console.error('[HOMBRE_VIVO_GET_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveTenantFromRequest(request);
    const tenantId = ctx?.tenantId;
    const supabase = createServiceClient();
    const { operator_id, objective_id, operator_name } = await request.json();

    if (!operator_id) {
      return NextResponse.json({ error: 'Operator ID is required' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const targetName = operator_name || 'operador';

    // 1. Insert alarm record
    const { data: alarm, error: alarmError } = await supabase.from('alarms').insert({
      triggered_by: 'gerente_manual',
      operator_id: operator_id,
      operator_name: targetName,
      objective_id: objective_id || null,
      tenant_id: tenantId || null,
      alarm_type: 'hombre_vivo_solicitud',
      severity: 'alta',
      message: `⚡ CONTROL HOMBRE VIVO SOLICITADO: Gerencia requiere verificación inmediata de presencia a ${targetName}.`,
      status: 'active',
      created_at: nowIso
    }).select().single();

    if (alarmError) console.error('[HOMBRE_VIVO_ALARM_ERROR]', alarmError);

    // 2. Log in guard_book_entries
    await supabase.from('guard_book_entries').insert({
      objective_id: objective_id || null,
      operator_id: operator_id,
      tenant_id: tenantId || null,
      entry_type: 'hombre_vivo',
      content: `⚡ CONTROL HOMBRE VIVO ENVIADO DESDE GERENCIA: Pendiente de confirmación por ${targetName}`,
      urgency: 'alta',
      created_at: nowIso
    });

    // 3. Send REAL Web Push notification to operator's device (works in background!)
    try {
      const targetIds = [operator_id];
      const { data: opRes } = await supabase
        .from('resources')
        .select('id, assigned_to, user_id, profile_id')
        .or(`id.eq.${operator_id},assigned_to.eq.${operator_id}`)
        .maybeSingle();

      if (opRes) {
        if (opRes.id) targetIds.push(opRes.id);
        if (opRes.assigned_to) targetIds.push(opRes.assigned_to);
        if (opRes.user_id) targetIds.push(opRes.user_id);
        if (opRes.profile_id) targetIds.push(opRes.profile_id);
      }

      const pushResult = await sendPushToUser(Array.from(new Set(targetIds)), {
        title: '⚡ CONTROL DE HOMBRE VIVO - SIGPAD',
        body: `Gerencia requiere tu verificación de presencia inmediata. Toca para confirmar.`,
        icon: '/Logo SIGPAD.png',
        url: '/operador',
        tag: `hombre-vivo-${alarm?.id || Date.now()}`,
        vibrate: [1000, 200, 1000, 200, 1000, 200, 1000, 200, 1000, 300, 1000],
        requireInteraction: true,
        data: { type: 'hombre_vivo', alarm_id: alarm?.id, operator_id }
      });
      console.log('[HOMBRE_VIVO] Web Push result:', pushResult);
    } catch (pushErr) {
      console.warn('[HOMBRE_VIVO] Web Push error (non-blocking):', pushErr);
    }

    // 4. Broadcast via Supabase Realtime as fallback for open tabs
    try {
      await supabase.channel('hombre-vivo-broadcast-channel').send({
        type: 'broadcast',
        event: 'hombre_vivo_dispatch',
        payload: {
          alarm_id: alarm?.id || 'manual-' + Date.now(),
          operator_id,
          operator_name: targetName,
          objective_id,
          timestamp: nowIso
        }
      });
    } catch (e) {}

    return NextResponse.json({ success: true, alarm });
  } catch (error: any) {
    console.error('[HOMBRE_VIVO_POST_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error al enviar check' }, { status: 500 });
  }
}
