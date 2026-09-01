import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { sendPushToUser } from '@/lib/web-push-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServiceClient();

    const [resourcesRes, objectivesRes, bookRes, alarmsRes] = await Promise.all([
      supabase.from('resources').select('*').in('status', ['activo', 'active']),
      supabase.from('objectives').select('id, name'),
      supabase.from('guard_book_entries')
        .select('*')
        .or('entry_type.eq.hombre_vivo,entry_type.eq.hombre_vivo_sin_respuesta,content.ilike.%hombre vivo%')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('alarms')
        .select('*')
        .or('alarm_type.eq.hombre_vivo,alarm_type.eq.hombre_vivo_sin_respuesta,alarm_type.eq.hombre_vivo_solicitud,message.ilike.%hombre vivo%')
        .order('created_at', { ascending: false })
        .limit(100)
    ]);

    const objMap: Record<string, string> = {};
    (objectivesRes.data || []).forEach((o: any) => {
      objMap[o.id] = o.name;
    });

    const activeGuards = (resourcesRes.data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      avatar_url: r.avatar_url,
      role: r.role,
      current_objective_id: r.current_objective_id,
      objective_name: r.current_objective_id ? objMap[r.current_objective_id] || 'Puesto Activo' : 'Puesto Activo'
    }));

    const resMap: Record<string, any> = {};
    (resourcesRes.data || []).forEach((r: any) => {
      resMap[r.id] = r;
    });

    const combined: any[] = [];

    (bookRes.data || []).forEach((e: any) => {
      const isUnanswered = e.entry_type === 'hombre_vivo_sin_respuesta' || 
                           e.urgency === 'critica' || 
                           (e.content || '').toLowerCase().includes('no atendido') ||
                           (e.content || '').toLowerCase().includes('sin responder');

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
        status: e.status === 'resolved' || e.status === 'resuelto' ? 'resuelto' 
               : isUnanswered ? 'sin_responder' : 'respondido',
        time_elapsed_minutes: elapsedMins,
        latitude: e.latitude,
        longitude: e.longitude,
        notes: e.content,
        urgency: e.urgency
      });
    });

    (alarmsRes.data || []).forEach((a: any) => {
      if (!combined.some(c => c.id === a.id)) {
        const elapsedMins = Math.floor((Date.now() - new Date(a.created_at).getTime()) / (1000 * 60));
        const opId = a.operator_id || a.triggered_by;
        const opName = a.operator_name || resMap[opId]?.name || 'Operador';

        combined.push({
          id: a.id,
          created_at: a.created_at,
          operator_id: opId,
          operator_name: opName,
          objective_id: a.objective_id,
          objective_name: a.objective_id ? objMap[a.objective_id] || 'Puesto Asignado' : 'Puesto Asignado',
          status: a.status === 'acknowledged' || a.status === 'resolved' ? 'resuelto' : 'sin_responder',
          time_elapsed_minutes: elapsedMins,
          latitude: a.latitude || a.operator_latitude,
          longitude: a.longitude || a.operator_longitude,
          notes: a.message,
          urgency: a.severity || 'critica'
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

export async function POST(request: Request) {
  try {
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
      entry_type: 'hombre_vivo',
      content: `⚡ CONTROL HOMBRE VIVO ENVIADO DESDE GERENCIA: Pendiente de confirmación por ${targetName}`,
      urgency: 'alta',
      created_at: nowIso
    });

    // 3. Send REAL Web Push notification to operator's device (works in background!)
    try {
      const pushResult = await sendPushToUser(operator_id, {
        title: '⚡ CONTROL DE HOMBRE VIVO - SIGPAD',
        body: `Gerencia requiere tu verificación de presencia inmediata. Toca para confirmar.`,
        icon: '/Logo SIGPAD.png',
        url: '/operador',
        tag: `hombre-vivo-${alarm?.id || Date.now()}`,
        vibrate: [500, 150, 500, 150, 500, 150, 800],
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
