import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const STANDARD_SHIFT_MINUTES = 480; // 8 horas

export async function POST(request: Request) {
  try {
    const { shift_id, latitude, longitude } = await request.json();
    
    // Handle demo mode
    if (!shift_id || shift_id.startsWith('demo-shift-')) {
       return NextResponse.json({ 
         shift: { id: shift_id, status: 'completado' } 
       });
    }

    const supabase = createServiceClient();

    // 1. Get the current shift to calculate duration
    const { data: currentShift, error: fetchError } = await supabase
      .from('guard_shifts')
      .select('*')
      .eq('id', shift_id)
      .single();

    if (fetchError || !currentShift) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
    }

    // 2. Calculate hours worked
    const checkoutTime = new Date().toISOString();
    const checkinTime = new Date(currentShift.checkin_time);
    const durationMs = new Date(checkoutTime).getTime() - checkinTime.getTime();
    const durationMinutes = Math.round(durationMs / 60000);
    const totalHours = parseFloat((durationMs / 3600000).toFixed(2));
    const overtimeMinutes = Math.max(0, durationMinutes - STANDARD_SHIFT_MINUTES);

    // 3. Update the shift record with calculated hours
    //    Strategy: try with total_hours first; if that fails (column not migrated yet),
    //    retry without it so checkout NEVER fails due to schema mismatch.
    let shift: any = null;
    const basePayload: Record<string, any> = {
      checkout_time: checkoutTime,
      checkout_latitude: latitude,
      checkout_longitude: longitude,
      status: 'completado',
      duration_minutes: durationMinutes,
      overtime_minutes: overtimeMinutes,
    };

    const { data: shiftFull, error: shiftErrorFull } = await supabase
      .from('guard_shifts')
      .update({ ...basePayload, total_hours: totalHours })
      .eq('id', shift_id)
      .select()
      .single();

    if (shiftErrorFull) {
      // Column may not exist yet — fallback without total_hours
      console.warn('[CHECKOUT] total_hours update failed, retrying without it:', shiftErrorFull.message);
      const { data: shiftFallback, error: shiftErrorFallback } = await supabase
        .from('guard_shifts')
        .update(basePayload)
        .eq('id', shift_id)
        .select()
        .single();
      if (shiftErrorFallback) throw shiftErrorFallback;
      shift = shiftFallback;
    } else {
      shift = shiftFull;
    }

    // 4. Update objective to clear coverage status (Instant Realtime trigger)
    if (currentShift.objective_id) {
      await supabase
        .from('objectives')
        .update({
          manned_status: 'Activo',
          current_operator_id: null
        })
        .eq('id', currentShift.objective_id);
    }

    // 5. Update resource back to disponible and clear objective
    if (currentShift.operator_id) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentShift.operator_id);
      const orConditions = [`id.eq.${currentShift.operator_id}`];
      if (isUUID) {
        orConditions.push(`assigned_to.eq.${currentShift.operator_id}`);
      }
      
      await supabase
        .from('resources')
        .update({ 
          status: 'disponible',
          current_shift_id: null,
          latitude: null,
          longitude: null
        })
        .or(orConditions.join(','));
    }

    // 5. PostGIS: Consolidate route and simplify
    try {
      // 5.1 Fetch points from the 'Hot' tracking table
      const { data: points } = await supabase
        .from('gps_tracking')
        .select('*')
        .eq('operator_id', currentShift.operator_id)
        .gte('recorded_at', currentShift.checkin_time)
        .lte('recorded_at', checkoutTime)
        .order('recorded_at', { ascending: true });

      if (points && points.length > 1) {
        // 5.2 Map Matching (Optional/Best Effort)
        let matchedPoints = points;
        try {
          const coordinates = points.map(p => `${p.longitude},${p.latitude}`).join(';');
          const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
          
          if (mapboxToken && points.length <= 100) { // Mapbox limit per request
            const matchRes = await fetch(`https://api.mapbox.com/matching/v5/mapbox/driving/${coordinates}?access_token=${mapboxToken}&geometries=geojson&overview=full`);
            if (matchRes.ok) {
              const matchData = await matchRes.json();
              if (matchData.matchings && matchData.matchings[0]) {
                console.log('[CHECKOUT] Map Matching successful');
                // We could use the GeoJSON from Mapbox directly, but to keep history granular,
                // we'll store the raw points for now and rely on the SQL consolidation.
                // In a future phase, we can store the Mapbox GeoJSON as the 'gold' route.
              }
            }
          }
        } catch (matchErr) {
          console.warn('[CHECKOUT] Map Matching failed, using raw points');
        }

        // 5.3 Transfer to 'Cold' history table as PostGIS geometries
        const historyPoints = points.map(p => ({
          shift_id: shift_id,
          operator_id: currentShift.operator_id,
          location: `POINT(${p.longitude} ${p.latitude})`,
          accuracy: p.accuracy,
          recorded_at: p.recorded_at
        }));

        await supabase.from('gps_history').insert(historyPoints);

        // 5.4 Trigger SQL Consolidation (MakeLine + Simplify)
        await supabase.rpc('consolidate_patrol_route', { p_shift_id: shift_id });
      }
    } catch (e) {
      console.error('[CHECKOUT] PostGIS consolidation error:', e);
    }

    // 6. Insert auto checkout log in guard book
    if (currentShift.objective_id) {
      await supabase.from('guard_book_entries').insert({
        objective_id: currentShift.objective_id,
        operator_id: currentShift.operator_id,
        entry_type: 'fichaje',
        content: `CIERRE DE TURNO — Duración: ${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m${overtimeMinutes > 0 ? ` (Horas extra: ${Math.floor(overtimeMinutes / 60)}h ${overtimeMinutes % 60}m)` : ''}`,
        latitude,
        longitude,
        urgency: 'normal',
      });
    }

    return NextResponse.json({ shift, durationMinutes, overtimeMinutes });
  } catch (error: any) {
    console.error('[CHECKOUT]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
