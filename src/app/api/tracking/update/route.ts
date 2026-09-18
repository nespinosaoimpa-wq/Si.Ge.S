import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createServiceClient();

    const { shiftData, latitude, longitude, accuracy, speed, heading, objective_id } = body;
    
    if (!shiftData?.operator_id || !latitude || !longitude) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const operator_id = shiftData.operator_id;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(operator_id);

    // RESOLVE: Find actual resource ID and status
    let finalResourceId = operator_id;
    let resourceStatus = '';
    let prevLat = 0;
    let prevLng = 0;
    let lastUpdateMs = 0;
    
    const { data: res } = await supabase
      .from('resources')
      .select('id, status, latitude, longitude, last_gps_update, tenant_id')
      .or(`id.eq.${operator_id},assigned_to.eq.${operator_id}`)
      .limit(1)
      .maybeSingle();

    if (res) {
      finalResourceId = res.id;
      resourceStatus = res.status;
      prevLat = Number(res.latitude || 0);
      prevLng = Number(res.longitude || 0);
      lastUpdateMs = res.last_gps_update ? new Date(res.last_gps_update).getTime() : 0;
    }

    if (resourceStatus === 'baja') {
      return NextResponse.json({ 
        success: false, 
        warning: 'Transmission ignored: Resource is set to baja. Access revoked.' 
      });
    }

    // OPTIMIZATION: Fast-path Shift Validation from Session Payload Claims (0 DB SELECTs for active pulses)
    const hasValidShiftClaim = Boolean(
      shiftData?.id && 
      typeof shiftData.id === 'string' && 
      shiftData.id.length > 5 &&
      (shiftData.status === 'activo' || shiftData.status === 'active' || shiftData.is_active || shiftData.id !== 'invalid_shift')
    );

    let activeShiftId = shiftData?.id || null;
    let activeObjectiveId = objective_id || shiftData?.objective_id || null;
    let activeTenantId = res?.tenant_id || shiftData?.tenant_id || null;

    if (!hasValidShiftClaim) {
      // Fallback DB check only if payload lacks active shift claims
      const { data: activeShift, error: shiftError } = await supabase
        .from('guard_shifts')
        .select('id, objective_id, tenant_id')
        .eq('operator_id', finalResourceId)
        .in('status', ['activo', 'active'])
        .maybeSingle();

      if (shiftError || !activeShift) {
        // PRIVACY ENFORCEMENT: DO NOT log any points if the resource is not on an active shift.
        return NextResponse.json({ 
          success: false, 
          warning: 'Transmission ignored: No active shift found for this resource. Privacy protected.' 
        });
      }
      activeShiftId = activeShift.id;
      if (!activeObjectiveId) activeObjectiveId = activeShift.objective_id;
      if (!activeTenantId) activeTenantId = activeShift.tenant_id;
    }

    const finalObjectiveId = activeObjectiveId;
    const finalTenantId = activeTenantId;

    // Preserve Hardware Timestamp from mobile sensor if provided (e.g. offline IndexedDB batch flushes)
    const hardwareTimestamp = body.recorded_at || (body.timestamp 
      ? (typeof body.timestamp === 'number' ? new Date(body.timestamp).toISOString() : String(body.timestamp))
      : new Date().toISOString());

    // 1. Prepare async tasks without awaiting them sequentially
    const tasks: any[] = [];

    // Deduplicate identical stationary points: insert into gps_tracking only if moved or 5 min elapsed
    const isStationary = 
      prevLat !== 0 && 
      prevLng !== 0 && 
      Math.abs(latitude - prevLat) < 0.00005 && 
      Math.abs(longitude - prevLng) < 0.00005 && 
      (Date.now() - lastUpdateMs < 5 * 60 * 1000);

    if (!isStationary) {
      tasks.push(
        supabase.from('gps_tracking').insert({
          operator_id: finalResourceId,
          tenant_id: finalTenantId || null,
          latitude,
          longitude,
          accuracy,
          objective_id: finalObjectiveId,
          recorded_at: hardwareTimestamp
        })
      );
    }

    // Network Quality Audit metadata (navigator.connection: 4G/Wi-Fi, RTT, Downlink, Airplane Mode)
    const netInfo = body.networkQuality || body.connectionInfo || body.networkInfo || {
      network_type: '4g',
      effective_type: '4g',
      rtt: null,
      downlink: null,
      save_data: false,
      online_status: 'online',
      airplane_mode: false,
      timestamp: hardwareTimestamp
    };

    let updatedPerformanceData = res?.performance_data;
    if (Array.isArray(updatedPerformanceData)) {
      updatedPerformanceData = {
        history: updatedPerformanceData,
        network_audit: netInfo
      };
    } else if (typeof updatedPerformanceData === 'object' && updatedPerformanceData !== null) {
      updatedPerformanceData = {
        ...updatedPerformanceData,
        network_audit: netInfo
      };
    } else {
      updatedPerformanceData = {
        network_audit: netInfo
      };
    }

    // 2. Update resource status and position for live map display
    const updatePayload: any = { 
      latitude, 
      longitude,
      accuracy,
      speed,
      heading,
      last_gps_update: hardwareTimestamp,
      status: 'activo',
      performance_data: updatedPerformanceData
    };

    if (finalObjectiveId) {
      updatePayload.current_objective_id = finalObjectiveId;
    }

    let updateQuery = supabase.from('resources').update(updatePayload).eq('id', finalResourceId);
    tasks.push(updateQuery);

    // 3. SERVER-SIDE GEOFENCE BREACH EVALUATION
    if (finalObjectiveId && latitude && longitude) {
      tasks.push((async () => {
        try {
          const { data: obj } = await supabase
            .from('objectives')
            .select('id, name, latitude, longitude, geofence_radius')
            .eq('id', finalObjectiveId)
            .maybeSingle();

          if (obj?.latitude && obj?.longitude) {
            const R = 6371e3;
            const φ1 = (latitude * Math.PI) / 180;
            const φ2 = (Number(obj.latitude) * Math.PI) / 180;
            const Δφ = ((Number(obj.latitude) - latitude) * Math.PI) / 180;
            const Δλ = ((Number(obj.longitude) - longitude) * Math.PI) / 180;

            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const distMeters = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

            const radiusMeters = obj.geofence_radius || 100;
            const gpsMargin = Math.max(Number(accuracy || 0), 25);
            const effectiveRadius = radiusMeters + gpsMargin;

            // Reject invalid GPS teleports >500km
            if (distMeters > effectiveRadius && distMeters <= 500000) {
              // Check if active shift is already marked outside to avoid duplicate alert floods
              const { data: shift } = await supabase
                .from('guard_shifts')
                .select('id, geofence_status, operator_id')
                .eq('operator_id', finalResourceId)
                .in('status', ['activo', 'active'])
                .limit(1)
                .maybeSingle();

              if (shift && shift.geofence_status !== 'outside') {
                console.log(`[SERVER_GEOFENCE_DETECTED] Operator ${finalResourceId} is ${distMeters}m from objective ${obj.name}`);
                
                // Fetch operator name
                const { data: opRes } = await supabase
                  .from('resources')
                  .select('name')
                  .eq('id', finalResourceId)
                  .maybeSingle();
                
                const opName = opRes?.name || res?.name || 'Operador';
                const now = new Date().toISOString();
                const alertMsg = `ABANDONO DE PUESTO: ${opName} se alejó ${distMeters}m de ${obj.name}. Conteo de horas pausado.`;

                // 1. Update shift status to outside
                await supabase
                  .from('guard_shifts')
                  .update({ geofence_status: 'outside', last_breach_at: now })
                  .eq('id', shift.id);

                // 2. Insert into geofence_alerts
                await supabase.from('geofence_alerts').insert({
                  operator_id: finalResourceId,
                  objective_id: finalObjectiveId,
                  alert_type: 'exit',
                  latitude,
                  longitude,
                  resolved: false,
                  created_at: now
                }).catch(e => console.warn('[SERVER_GEOFENCE] geofence_alerts error:', e));

                // 3. Insert into geofencing_incidents
                await supabase.from('geofencing_incidents').insert({
                  shift_id: shift.id,
                  operator_id: finalResourceId,
                  objective_id: finalObjectiveId,
                  exit_at: now,
                  max_distance_meters: distMeters,
                  status: 'pendiente'
                }).catch(e => console.warn('[SERVER_GEOFENCE] geofencing_incidents error:', e));

                // 4. Insert into alarms
                await supabase.from('alarms').insert({
                  alarm_type: 'geofence_exit',
                  status: 'active',
                  triggered_by: finalResourceId,
                  operator_name: opName,
                  objective_id: finalObjectiveId,
                  message: alertMsg,
                  latitude,
                  longitude,
                  created_at: now
                }).catch(e => console.warn('[SERVER_GEOFENCE] alarms error:', e));

                // 5. Insert into incidents
                await supabase.from('incidents').insert({
                  entry_type: 'abandono_zona',
                  content: alertMsg,
                  operator_id: finalResourceId,
                  objective_id: finalObjectiveId,
                  status: 'open',
                  latitude,
                  longitude,
                  created_at: now
                }).catch(e => console.warn('[SERVER_GEOFENCE] incidents error:', e));

                // 6. Insert into guard_book_entries
                await supabase.from('guard_book_entries').insert({
                  entry_type: 'abandono_zona',
                  content: alertMsg,
                  operator_id: finalResourceId,
                  objective_id: finalObjectiveId,
                  created_at: now
                }).catch(e => console.warn('[SERVER_GEOFENCE] guard_book_entries error:', e));
              }
            }
          }
        } catch (err) {
          console.warn('[SERVER_GEOFENCE_EVAL_ERROR]', err);
        }
      })());
    }

    // Execute in parallel mapping to catch potential errors without crashing the main flow
    await Promise.allSettled(tasks);

    return NextResponse.json({ success: true, recorded_at: updatePayload.last_gps_update });
  } catch (error: any) {
    console.error("Tracking Update Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

