import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  return handleShiftMonitor(request);
}

export async function POST(request: Request) {
  return handleShiftMonitor(request);
}

async function handleShiftMonitor(request: Request) {
  try {
    const supabase = createServiceClient();
    const now = new Date().toISOString();

    // 1. Fetch all active guard shifts
    const { data: activeShifts, error: shiftError } = await supabase
      .from('guard_shifts')
      .select('id, operator_id, objective_id, geofence_status, checkin_time, tenant_id, objectives(id, name, latitude, longitude, geofence_radius), resources(id, name, latitude, longitude, last_gps_update)')
      .in('status', ['activo', 'active']);

    if (shiftError || !activeShifts) {
      return NextResponse.json({ success: true, count: 0, checked: [] });
    }

    const alertsTriggered: any[] = [];

    for (const shift of activeShifts) {
      const obj: any = shift.objectives;
      const res: any = shift.resources;

      if (!obj || !obj.latitude || !obj.longitude) continue;

      let opLat = Number(res?.latitude || 0);
      let opLng = Number(res?.longitude || 0);

      // Fallback to latest gps_tracking point if resource coords are missing
      if (opLat === 0 || opLng === 0) {
        const { data: latestTrack } = await supabase
          .from('gps_tracking')
          .select('latitude, longitude')
          .eq('operator_id', shift.operator_id)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestTrack?.latitude && latestTrack?.longitude) {
          opLat = Number(latestTrack.latitude);
          opLng = Number(latestTrack.longitude);
        }
      }

      if (opLat === 0 || opLng === 0) continue;

      // Calculate Haversine distance
      const R = 6371e3;
      const φ1 = (opLat * Math.PI) / 180;
      const φ2 = (Number(obj.latitude) * Math.PI) / 180;
      const Δφ = ((Number(obj.latitude) - opLat) * Math.PI) / 180;
      const Δλ = ((Number(obj.longitude) - opLng) * Math.PI) / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const distMeters = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

      const radiusMeters = Number(obj.geofence_radius || 100);
      const effectiveRadius = radiusMeters + 25;

      if (distMeters > effectiveRadius && distMeters <= 500000) {
        if (shift.geofence_status !== 'outside') {
          const operatorName = res?.name || 'Operador';
          const objectiveName = obj.name || 'Puesto Asignado';

          // Update shift
          await supabase
            .from('guard_shifts')
            .update({
              geofence_status: 'outside',
              last_breach_at: now,
              notes: `⚠️ Alerta de Geocerca: Operador a ${distMeters}m de ${objectiveName} (Radio: ${radiusMeters}m)`
            })
            .eq('id', shift.id);

          // Insert geofence alert
          await supabase.from('geofence_alerts').insert({
            operator_id: shift.operator_id,
            objective_id: shift.objective_id,
            alert_type: 'exit',
            latitude: opLat,
            longitude: opLng,
            resolved: false,
            created_at: now,
            tenant_id: shift.tenant_id
          });

          // Insert alarm
          await supabase.from('alarms').insert({
            alarm_type: 'geofence_exit',
            status: 'active',
            triggered_by: shift.operator_id,
            operator_name: operatorName,
            objective_id: shift.objective_id,
            objective_name: objectiveName,
            message: `🚨 ABANDONO DE PUESTO: ${operatorName} se alejó ${distMeters}m de ${objectiveName}. CÓMPUTO DE HORAS PAUSADO.`,
            latitude: opLat,
            longitude: opLng,
            created_at: now,
            tenant_id: shift.tenant_id
          });

          // Insert incident
          await supabase.from('incidents').insert({
            operator_id: shift.operator_id,
            objective_id: shift.objective_id,
            entry_type: 'abandono_zona',
            content: `⚠️ ALERTA GEOCERCA: ${operatorName} se alejó ${distMeters}m de ${objectiveName}. Conteo de horas pausado.`,
            latitude: opLat,
            longitude: opLng,
            status: 'abierto',
            created_at: now,
            tenant_id: shift.tenant_id
          });

          // Insert guard book entry
          await supabase.from('guard_book_entries').insert({
            objective_id: shift.objective_id,
            operator_id: shift.operator_id,
            entry_type: 'abandono_zona',
            content: `⚠️ ALERTA DE ABANDONO: El operador ${operatorName} se alejó ${distMeters}m de ${objectiveName}. Conteo de horas PAUSADO.`,
            latitude: opLat,
            longitude: opLng,
            urgency: 'critica',
            created_at: now,
            tenant_id: shift.tenant_id
          });

          alertsTriggered.push({
            shift_id: shift.id,
            operator_name: operatorName,
            objective_name: objectiveName,
            distance: distMeters
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      activeShiftsCount: activeShifts.length,
      alertsTriggered
    });
  } catch (error: any) {
    console.error('[SHIFT_MONITOR_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
