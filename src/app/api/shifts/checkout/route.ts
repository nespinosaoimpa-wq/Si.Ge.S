import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const STANDARD_SHIFT_MINUTES = 480; // 8 horas

export async function POST(request: Request) {
  try {
    const { shift_id, operator_id, email, latitude, longitude } = await request.json();
    
    // Handle demo mode
    if (shift_id?.startsWith('demo-shift-')) {
       return NextResponse.json({ 
         shift: { id: shift_id, status: 'completado' } 
       });
    }

    const supabase = createServiceClient();
    let currentShift: any = null;

    // 1. Resolve current shift by shift_id
    if (shift_id) {
      const { data } = await supabase
        .from('guard_shifts')
        .select('*')
        .eq('id', shift_id)
        .maybeSingle();
      if (data) currentShift = data;
    }

    // Fallback: search by operator_id or email for active shift if shift_id was missing/stale
    if (!currentShift && (operator_id || email)) {
      let query = supabase.from('guard_shifts').select('*').in('status', ['activo', 'active']);
      
      let resId: string | null = null;
      if (operator_id) {
        const { data: res } = await supabase.from('resources').select('id').or(`id.eq.${operator_id},assigned_to.eq.${operator_id}`).limit(1).maybeSingle();
        if (res?.id) resId = res.id;
      }

      const conditions: string[] = [];
      if (operator_id) conditions.push(`operator_id.eq.${operator_id}`);
      if (resId) conditions.push(`operator_id.eq.${resId}`);
      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      }

      const { data: activeS } = await query.order('checkin_time', { ascending: false }).limit(1).maybeSingle();
      if (activeS) currentShift = activeS;
    }

    const targetShiftId = currentShift?.id || shift_id;
    const checkoutTime = new Date().toISOString();
    const checkinTime = currentShift?.checkin_time ? new Date(currentShift.checkin_time) : new Date(Date.now() - 8 * 3600 * 1000);
    const grossDurationMs = new Date(checkoutTime).getTime() - checkinTime.getTime();
    const grossDurationMinutes = Math.max(1, Math.round(grossDurationMs / 60000));
    const grossHours = parseFloat((grossDurationMs / 3600000).toFixed(2));

    // TACTICAL BLUEPRINT REQUIREMENT: Calculate total abandonment time for shift audit deduction
    let abandonedMs = 0;
    if (targetShiftId) {
      try {
        const { data: incidents } = await supabase
          .from('geofencing_incidents')
          .select('exit_at, return_at')
          .eq('shift_id', targetShiftId);

        if (incidents && incidents.length > 0) {
          incidents.forEach(inc => {
            const exit = inc.exit_at ? new Date(inc.exit_at).getTime() : null;
            const ret = inc.return_at ? new Date(inc.return_at).getTime() : new Date(checkoutTime).getTime();
            if (exit && ret > exit) {
              abandonedMs += (ret - exit);
            }
          });
        }
      } catch (e) {
        console.warn('[CHECKOUT] Abandonment calculation notice:', e);
      }
    }

    const abandonedMinutes = Math.round(abandonedMs / 60000);
    const netDurationMs = Math.max(0, grossDurationMs - abandonedMs);
    const netDurationMinutes = Math.max(0, Math.round(netDurationMs / 60000));
    const totalNetHours = parseFloat((netDurationMs / 3600000).toFixed(2));
    const overtimeMinutes = Math.max(0, netDurationMinutes - STANDARD_SHIFT_MINUTES);

    const basePayload: Record<string, any> = {
      checkout_time: checkoutTime,
      checkout_latitude: latitude || 0,
      checkout_longitude: longitude || 0,
      status: 'completado',
      duration_minutes: netDurationMinutes,
      gross_duration_minutes: grossDurationMinutes,
      abandoned_minutes: abandonedMinutes,
      overtime_minutes: overtimeMinutes,
    };

    if (targetShiftId) {
      // 3. Update the shift record with calculated net hours
      const { error: shiftErrorFull } = await supabase
        .from('guard_shifts')
        .update({ ...basePayload, total_hours: totalNetHours })
        .eq('id', targetShiftId);

      if (shiftErrorFull) {
        await supabase
          .from('guard_shifts')
          .update(basePayload)
          .eq('id', targetShiftId);
      }
    }

    // ALSO update any remaining active shifts for this operator to prevent orphan active shifts
    const finalOpId = currentShift?.operator_id || operator_id;
    if (finalOpId) {
      try {
        await supabase
          .from('guard_shifts')
          .update({ ...basePayload, total_hours: totalNetHours })
          .eq('operator_id', finalOpId)
          .in('status', ['activo', 'active']);
      } catch (e) {}
    }

    // 4. Update objective to clear coverage status only if no remaining active shifts
    if (currentShift?.objective_id) {
      const { data: remainingShifts } = await supabase
        .from('guard_shifts')
        .select('id')
        .eq('objective_id', currentShift.objective_id)
        .is('checkout_time', null)
        .neq('id', targetShiftId || '');

      const isStillManned = remainingShifts && remainingShifts.length > 0;
      if (!isStillManned) {
        await supabase
          .from('objectives')
          .update({
            manned_status: 'Activo',
            current_operator_id: null
          })
          .eq('id', currentShift.objective_id);
      }
    }

    // 5. Update resource back to disponible
    if (finalOpId) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalOpId);
      const orConditions = [`id.eq.${finalOpId}`];
      if (isUUID) {
        orConditions.push(`assigned_to.eq.${finalOpId}`);
      }
      
      await supabase
        .from('resources')
        .update({ 
          status: 'disponible',
          current_shift_id: null,
          current_objective_id: null,
          latitude: null,
          longitude: null
        })
        .or(orConditions.join(','));
    }

    // 6. PostGIS: Consolidate route and simplify (best effort)
    if (targetShiftId && finalOpId) {
      try {
        const { data: points } = await supabase
          .from('gps_tracking')
          .select('*')
          .eq('operator_id', finalOpId)
          .gte('recorded_at', checkinTime.toISOString())
          .lte('recorded_at', checkoutTime)
          .order('recorded_at', { ascending: true });

        if (points && points.length > 1) {
          const historyPoints = points.map(p => ({
            shift_id: targetShiftId,
            operator_id: finalOpId,
            location: `POINT(${p.longitude} ${p.latitude})`,
            accuracy: p.accuracy,
            recorded_at: p.recorded_at
          }));

          await supabase.from('gps_history').insert(historyPoints);
          await supabase.rpc('consolidate_patrol_route', { p_shift_id: targetShiftId });
        }
      } catch (e) {
        console.error('[CHECKOUT] PostGIS consolidation notice:', e);
      }
    }

    // 7. Insert auto checkout log in guard book
    if (currentShift?.objective_id && finalOpId) {
      try {
        await supabase.from('guard_book_entries').insert({
          objective_id: currentShift.objective_id,
          operator_id: finalOpId,
          entry_type: 'fichaje',
          content: `CIERRE DE TURNO — Duración neta: ${Math.floor(netDurationMinutes / 60)}h ${netDurationMinutes % 60}m${abandonedMinutes > 0 ? ` (Abandono descontado: ${abandonedMinutes}m)` : ''}${overtimeMinutes > 0 ? ` (Horas extra: ${Math.floor(overtimeMinutes / 60)}h ${overtimeMinutes % 60}m)` : ''}`,
          latitude: latitude || 0,
          longitude: longitude || 0,
          urgency: 'normal',
        });
      } catch (e) {}
    }

    return NextResponse.json({ 
      shift: { id: targetShiftId || 'checkout-completed', status: 'completado', total_hours: totalNetHours }, 
      durationMinutes: netDurationMinutes,
      grossDurationMinutes,
      abandonedMinutes, 
      totalHours: totalNetHours,
      overtimeMinutes 
    });
  } catch (error: any) {
    console.error('[CHECKOUT] Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
