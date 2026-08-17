import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { operator_id, email, objective_id, latitude, longitude, accuracy = 0 } = await request.json();

    const supabase = createServiceClient();

    // 1. Fetch Objective specific radius if available
    let targetRadius = 100;
    let objectiveLocation: { lat: number, lng: number } | null = null;
    if (objective_id && objective_id !== 'null') {
      try {
        const { data: objective } = await supabase
          .from('objectives')
          .select('geofence_radius, geofence_radius_meters, latitude, longitude, name')
          .eq('id', objective_id)
          .maybeSingle();

        const configuredRadius = Number(objective?.geofence_radius || objective?.geofence_radius_meters || 100);
        if (configuredRadius > 0) targetRadius = configuredRadius;

        if (objective?.latitude && objective?.longitude) {
          objectiveLocation = { lat: Number(objective.latitude), lng: Number(objective.longitude) };
        }
      } catch (e) {}
    }

    // 2. Verify Geofence (DYNAMIC TOLERANCE: Radio + Accuracy + Minimum Indoor Margin)
    let isWithinGeofence = true;
    let distanceToObjective = 0;
    
    if (objective_id && objective_id !== 'null' && objectiveLocation && objectiveLocation.lat !== 0 && objectiveLocation.lng !== 0) {
      // Calculate real distance using Haversine
      const R = 6371e3; // meters
      const φ1 = latitude * Math.PI / 180;
      const φ2 = objectiveLocation.lat * Math.PI / 180;
      const Δφ = (objectiveLocation.lat - latitude) * Math.PI / 180;
      const Δλ = (objectiveLocation.lng - longitude) * Math.PI / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceToObjective = R * c;

      // FORMULA: Distance <= (Target Radius + Dynamic Margin for GPS Accuracy)
      // Dynamic margin guarantees indoor/subterranean checkin when near objective
      const gpsMargin = Math.max(Number(accuracy || 0), 25);
      const dynamicTolerance = targetRadius + gpsMargin;
      isWithinGeofence = distanceToObjective <= dynamicTolerance;
      
      // STRICT BLOCK IF OUTSIDE GEOFENCE
      if (!isWithinGeofence) {
        return NextResponse.json({ 
          error: 'FUERA DE RANGO',
          message: `Estás a ${Math.round(distanceToObjective)}m del objetivo. El radio permitido es ${targetRadius}m (+${Math.round(gpsMargin)}m de margen GPS).`,
          isWithinGeofence: false,
          targetRadius,
          distance: Math.round(distanceToObjective),
          accuracy
        }, { status: 403 });
      }
    }

    // 3. Resolve the resource record — ALWAYS use resources.id for guard_shifts
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(operator_id);

    let resourceRecord: any = null;

    // First try to find by exact ID or assigned_to (UUID check)
    if (isUUID) {
      const { data: byId } = await supabase
        .from('resources')
        .select('id, assigned_to, email, name, role, status, current_objective_id')
        .or(`id.eq.${operator_id},assigned_to.eq.${operator_id}`)
        .order('status', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (byId) {
        resourceRecord = byId;
      }
    }

    // If not resolved by direct ID, search by email
    if (!resourceRecord && email) {
      // First try to find an active resource with this email
      const { data: activeByEmail } = await supabase
        .from('resources')
        .select('id, assigned_to, email, name, role, status, current_objective_id')
        .ilike('email', email.trim())
        .neq('status', 'baja')
        .limit(1)
        .maybeSingle();

      if (activeByEmail) {
        resourceRecord = activeByEmail;
      } else {
        // If no active resource, try to find a de-activated (baja) resource with this email
        // so we can deny access instead of creating a new active profile.
        const { data: inactiveByEmail } = await supabase
          .from('resources')
          .select('id, assigned_to, email, name, role, status, current_objective_id')
          .ilike('email', email.trim())
          .limit(1)
          .maybeSingle();
        
        if (inactiveByEmail) {
          resourceRecord = inactiveByEmail;
        }
      }
    }

    if (resourceRecord) {
      if (resourceRecord.status === 'baja') {
        return NextResponse.json({ 
          error: 'ACCESO DENEGADO',
          message: 'Tu legajo se encuentra de baja en el sistema. Consulta con administración.' 
        }, { status: 403 });
      }
      // Auto-link Auth UUID ↔ resource if not yet linked
      if (isUUID && resourceRecord.assigned_to !== operator_id) {
        await supabase.from('resources').update({ assigned_to: operator_id }).eq('id', resourceRecord.id);
      }
    } else if (!isUUID) {
      // Non-UUID and not found in resources — demo/bypass mode
      return NextResponse.json({
        shift: { id: 'demo-shift-' + Date.now(), status: 'activo' },
        isWithinGeofence,
        warning: !isWithinGeofence ? `Ubicación fuera del radio de ${targetRadius}m (MODO DEMO)` : null
      });
    } else {
      // UUID user not found in resources — create a resource record using the Auth UUID
      const tempId = operator_id; // USE THE UUID DIRECTLY!
      const { data: newResource } = await supabase.from('resources').upsert({
        id: tempId,
        name: email?.split('@')[0] || 'Operador',
        role: 'Vigilador',
        status: 'activo',
        email: email || null,
        assigned_to: operator_id,
        latitude,
        longitude,
      }, { onConflict: 'id' }).select().single();

      resourceRecord = newResource || { id: tempId };
    }

    // CRITICAL: Always use a valid UUID for guard_shifts.operator_id
    const finalResourceId = resourceRecord.id;

    // 3.5 Prevent Duplicate Active Shifts
    const { data: existingActiveShift } = await supabase
      .from('guard_shifts')
      .select('*')
      .eq('operator_id', finalResourceId)
      .eq('status', 'activo')
      .maybeSingle();

    if (existingActiveShift) {
      // Si ya hay un turno activo, devolverlo sin crear otro
      return NextResponse.json({
        shift: existingActiveShift,
        resource_id: finalResourceId,
        isWithinGeofence: existingActiveShift.checkin_within_geofence,
        objectiveLocation,
        geofenceRadius: targetRadius,
        warning: 'Turno recuperado (ya tenías un turno activo).'
      });
    }

    // 4. Create the shift record
    const { data: shift, error: shiftError } = await supabase
      .from('guard_shifts')
      .insert({
        operator_id: finalResourceId,
        objective_id: (objective_id && objective_id !== 'null') ? objective_id : null,
        checkin_time: new Date().toISOString(),
        checkin_latitude: latitude,
        checkin_longitude: longitude,
        status: 'activo',
        checkin_within_geofence: isWithinGeofence,
      })
      .select()
      .single();

    if (shiftError) {
      console.error('[CHECKIN] Shift insert error:', shiftError);
      throw shiftError;
    }

    // 5. Update resource: set active, link shift and objective
    await supabase
      .from('resources')
      .update({
        latitude,
        longitude,
        status: 'activo',
        current_objective_id: (objective_id && objective_id !== 'null') ? objective_id : resourceRecord.current_objective_id,
        current_shift_id: shift.id,
        last_gps_update: new Date().toISOString(),
      })
      .eq('id', finalResourceId);

    // 6. Update objective: mark as covered
    if (objective_id && objective_id !== 'null') {
      await supabase
        .from('objectives')
        .update({
          manned_status: 'Cubierto',
          current_operator_id: finalResourceId
        })
        .eq('id', objective_id);
    }

    // 7. Auto-insert check-in log in guard book
    if (finalResourceId && objective_id && objective_id !== 'null') {
      await supabase.from('guard_book_entries').insert({
        objective_id: objective_id,
        operator_id: finalResourceId,
        entry_type: 'fichaje',
        content: `INICIO DE TURNO — Operador fichó la entrada${isWithinGeofence ? '' : ' ⚠️ FUERA DE GEOCERCA'}`,
        latitude,
        longitude,
        urgency: isWithinGeofence ? 'normal' : 'alta',
      });
    }

    return NextResponse.json({
      shift,
      resource_id: finalResourceId,
      isWithinGeofence,
      objectiveLocation,
      geofenceRadius: targetRadius,
      warning: !isWithinGeofence ? `Ubicación fuera del radio de ${targetRadius}m` : null
    });
  } catch (error: any) {
    console.error(JSON.stringify({
      level: 'error',
      context: 'CHECKIN_API',
      message: error.message || 'Internal Server Error',
      stack: error.stack
    }));
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
