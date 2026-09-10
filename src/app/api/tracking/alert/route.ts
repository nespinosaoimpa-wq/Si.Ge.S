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
        const { data: obj } = await supabase
          .from('objectives')
          .select('name, tenant_id')
          .eq('id', objective_id)
          .maybeSingle();
        if (obj?.name) objectiveName = obj.name;
        if (obj?.tenant_id) tenantId = obj.tenant_id;
      }
      if (operator_id) {
        const { data: op } = await supabase
          .from('resources')
          .select('name, tenant_id')
          .or(`id.eq.${operator_id},assigned_to.eq.${operator_id},user_id.eq.${operator_id},profile_id.eq.${operator_id}`)
          .limit(1)
          .maybeSingle();
        if (op?.name) operatorName = op.name;
        if (!tenantId && op?.tenant_id) tenantId = op.tenant_id;
      }
    } catch (e) {
      console.warn('[GEOTRACKING_ALERT] Error fetching names:', e);
    }

    const distMeters = Math.round(distance || 0);

    if (type === 'exit') {
      // ════ REJECT INVALID / NULL ISLAND ANOMALIES (>500km distance indicates unconfigured coords) ════
      if (distMeters > 500000 || (latitude !== undefined && Math.abs(Number(latitude)) < 0.1 && Math.abs(Number(longitude)) < 0.1)) {
        console.warn(`[GEOTRACKING_ALERT] Ignored invalid exit alert: distance=${distMeters}m, lat=${latitude}, lng=${longitude}`);
        return NextResponse.json({ success: false, reason: 'invalid_distance_or_coordinates' });
      }

      // ════ REGISTRO EN TABLA GEOFENCE_ALERTS ════
      try {
        await supabase.from('geofence_alerts').insert({
          operator_id: operator_id || null,
          objective_id: objective_id || null,
          alert_type: 'exit',
          latitude: latitude || 0,
          longitude: longitude || 0,
          resolved: false,
          created_at: now,
          tenant_id: tenantId
        });
      } catch (err) {
        console.warn('[GEOTRACKING_ALERT] geofence_alerts insert failed:', err);
      }

      // ════ ALERTA PARA EL GERENTE EN TABLA ALARMS (Sirena & Live Feed) ════
      try {
        await supabase.from('alarms').insert({
          alarm_type: 'geofence_exit',
          status: 'active',
          triggered_by: operator_id || null,
          operator_name: operatorName,
          objective_id: objective_id || null,
          message: `🚨 ABANDONO DE PUESTO: ${operatorName} se alejó ${distMeters}m de ${objectiveName}. CÓMPUTO DE HORAS PAUSADO.`,
          latitude: latitude || 0,
          longitude: longitude || 0,
          created_at: now,
          tenant_id: tenantId
        });
      } catch (err) {
        console.warn('[GEOTRACKING_ALERT] alarms insert failed:', err);
      }

      // ════ REGISTRO EN TABLA INCIDENTS ════
      try {
        await supabase.from('incidents').insert({
          operator_id: operator_id || null,
          objective_id: objective_id || null,
          entry_type: 'alerta',
          content: `⚠️ ALERTA GEOCERCA: ${operatorName} se alejó ${distMeters}m de ${objectiveName}. Conteo de horas pausado.`,
          latitude: latitude || 0,
          longitude: longitude || 0,
          status: 'pendiente',
          created_at: now,
          tenant_id: tenantId
        });
      } catch (err) {
        console.warn('[GEOTRACKING_ALERT] incidents insert failed:', err);
      }

      // ════ ENTRADA EN LA BITÁCORA TÁCTICA GUARD_BOOK_ENTRIES ════
      try {
        await supabase.from('guard_book_entries').insert({
          objective_id: objective_id || null,
          operator_id: operator_id || null,
          entry_type: 'alerta',
          content: `⚠️ ALERTA DE ABANDONO: El operador ${operatorName} se alejó ${distMeters}m de ${objectiveName}. Conteo de horas PAUSADO.`,
          latitude: latitude || 0,
          longitude: longitude || 0,
          urgency: 'critica',
          created_at: now,
          tenant_id: tenantId
        });
      } catch (err) {
        console.warn('[GEOTRACKING_ALERT] guard_book_entries insert failed:', err);
      }

    } else if (type === 'entry') {
      // ════ REINGRESO AL PUESTO DE TRABAJO ════
      try {
        await supabase
          .from('geofence_alerts')
          .update({ resolved: true, resolved_at: now })
          .eq('objective_id', objective_id)
          .eq('resolved', false);
      } catch (err) {}

      try {
        await supabase
          .from('alarms')
          .update({ status: 'resolved', resolved_at: now })
          .eq('objective_id', objective_id)
          .eq('status', 'active');
      } catch (err) {}

      try {
        await supabase.from('guard_book_entries').insert({
          objective_id: objective_id || null,
          operator_id: operator_id || null,
          entry_type: 'novedad',
          content: `✅ REINGRESO AL PUESTO: El operador ${operatorName} ha regresado a ${objectiveName}. Conteo de horas REANUDADO.`,
          latitude: latitude || 0,
          longitude: longitude || 0,
          urgency: 'normal',
          created_at: now,
          tenant_id: tenantId
        });
      } catch (err) {}
    }

    return NextResponse.json({ success: true, is_paused: type === 'exit' });
  } catch (error: any) {
    console.error('[GEOTRACKING_ALERT]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

