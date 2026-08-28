import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { shift_id, operator_id, objective_id, type, latitude, longitude, distance } = await request.json();

    const supabase = createServiceClient();
    const now = new Date().toISOString();

    // 1. Fetch details of operator and objective for notification text
    let operatorName = 'Vigilador';
    let objectiveName = 'Puesto Asignado';
    let tenantId: string | null = null;

    try {
      if (objective_id) {
        const { data: obj } = await supabase.from('objectives').select('name, tenant_id').eq('id', objective_id).maybeSingle();
        if (obj?.name) objectiveName = obj.name;
        if (obj?.tenant_id) tenantId = obj.tenant_id;
      }
      if (!tenantId && operator_id) {
        const { data: op } = await supabase.from('resources').select('name, tenant_id').or(`id.eq.${operator_id},assigned_to.eq.${operator_id}`).limit(1).maybeSingle();
        if (op?.name) operatorName = op.name;
        if (op?.tenant_id) tenantId = op.tenant_id;
      }
    } catch (e) {}

    const distMeters = Math.round(distance || 0);

    if (type === 'exit') {
      // ════ CONGELAR / PAUSAR CÓMPUTO DE MINUTOS DE TURNO ════
      if (shift_id) {
        await supabase
          .from('guard_shifts')
          .update({
            is_paused: true,
            paused_reason: 'abandono_geocerca',
            geofence_status: 'outside',
            last_exit_at: now
          })
          .eq('id', shift_id);
      }

      if (operator_id) {
        await supabase
          .from('resources')
          .update({
            is_geofence_paused: true,
            geofence_status: 'outside'
          })
          .or(`id.eq.${operator_id},assigned_to.eq.${operator_id}`);
      }

      // ════ CREAR REGISTRO DE INCIDENCIA GEOFENCING ════
      await supabase.from('geofencing_incidents').insert({
        shift_id,
        operator_id,
        objective_id,
        exit_at: now,
        max_distance_meters: distMeters,
        status: 'pendiente',
        tenant_id: tenantId
      });

      // ════ ALERTA PARA EL GERENTE (TABLA ALARMS) ════
      await supabase.from('alarms').insert({
        alarm_type: 'geofence_exit',
        status: 'active',
        operator_id: operator_id,
        objective_id: objective_id,
        operator_name: operatorName,
        message: `🚨 ABANDONO DE PUESTO: ${operatorName} se alejó ${distMeters}m de ${objectiveName}. CÓMPUTO DE HORAS PAUSADO.`,
        latitude: latitude || 0,
        longitude: longitude || 0,
        created_at: now,
        tenant_id: tenantId
      });

      // ════ ALERTA PUSH / NOTIFICACIÓN PARA GERENCIA Y SUPERVISORES ════
      try {
        let managerQuery = supabase
          .from('resources')
          .select('id')
          .in('role', ['owner', 'gerente', 'superadmin', 'supervisor']);
        if (tenantId) managerQuery = managerQuery.eq('tenant_id', tenantId);
        const { data: managers } = await managerQuery;

        if (managers && managers.length > 0) {
          const notifications = managers.map(m => ({
            resource_id: m.id,
            type: 'alerta',
            title: '🚨 ABANDONO DE PUESTO - CÓMPUTO PAUSADO',
            body: `El operador ${operatorName} se alejó ${distMeters}m de ${objectiveName}. El conteo de minutos de su turno ha sido CONGELADO automáticamente.`,
            data: { operator_id, objective_id, distance: distMeters, latitude, longitude },
            created_at: now,
            tenant_id: tenantId
          }));
          await supabase.from('notifications').insert(notifications);
        }
      } catch (err) {}

      // ════ ALERTA PUSH / NOTIFICACIÓN PARA EL OPERADOR ════
      if (operator_id) {
        try {
          await supabase.from('notifications').insert({
            resource_id: operator_id,
            type: 'alerta',
            title: '⚠️ REGRESA A TU PUESTO - CÓMPUTO PAUSADO',
            body: `Te has alejado ${distMeters}m de ${objectiveName}. El conteo de horas trabajadas se ha DETENIDO. Regresa a la zona autorizada para reanudarlo.`,
            data: { type: 'geofence_warning', distance: distMeters },
            created_at: now,
            tenant_id: tenantId
          });
        } catch (err) {}
      }
    } else if (type === 'entry') {
      // ════ REANUDAR CÓMPUTO DE MINUTOS DE TURNO ════
      if (shift_id) {
        await supabase
          .from('guard_shifts')
          .update({
            is_paused: false,
            paused_reason: null,
            geofence_status: 'inside'
          })
          .eq('id', shift_id);
      }

      if (operator_id) {
        await supabase
          .from('resources')
          .update({
            is_geofence_paused: false,
            geofence_status: 'inside'
          })
          .or(`id.eq.${operator_id},assigned_to.eq.${operator_id}`);
      }

      // Cerrar la incidencia abierta
      const { data: lastIncident } = await supabase
        .from('geofencing_incidents')
        .select('*')
        .eq('shift_id', shift_id)
        .is('return_at', null)
        .order('exit_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastIncident) {
        await supabase
          .from('geofencing_incidents')
          .update({
            return_at: now,
            max_distance_meters: Math.max(lastIncident.max_distance_meters || 0, distMeters)
          })
          .eq('id', lastIncident.id);
      }

      // Notificación de reingreso al operador
      if (operator_id) {
        try {
          await supabase.from('notifications').insert({
            resource_id: operator_id,
            type: 'novedad',
            title: '✅ REINGRESO DETECTADO - CÓMPUTO REANUDADO',
            body: `Has regresado a la zona autorizada de ${objectiveName}. Se ha reanudado el conteo de minutos de tu turno.`,
            created_at: now,
            tenant_id: tenantId
          });
        } catch (err) {}
      }
    }

    // Insertar entrada en la bitácora táctica guard_book_entries
    await supabase.from('guard_book_entries').insert({
      objective_id: objective_id,
      operator_id: operator_id,
      entry_type: type === 'exit' ? 'alerta' : 'novedad',
      content: type === 'exit' 
        ? `⚠️ ALERTA DE ABANDONO: El operador ${operatorName} se alejó ${distMeters}m de ${objectiveName}. Conteo de horas PAUSADO.`
        : `✅ REINGRESO AL PUESTO: El operador ${operatorName} ha regresado a ${objectiveName}. Conteo de horas REANUDADO.`,
      latitude: latitude || 0,
      longitude: longitude || 0,
      urgency: type === 'exit' ? 'critica' : 'normal',
      tenant_id: tenantId
    });

    return NextResponse.json({ success: true, is_paused: type === 'exit' });
  } catch (error: any) {
    console.error('[GEOTRACKING_ALERT]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
