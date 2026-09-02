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
      .select('id, status, latitude, longitude, last_gps_update')
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

    // SAFETY CHECK: Verify the resource has an active shift
    const { data: activeShift, error: shiftError } = await supabase
      .from('guard_shifts')
      .select('id, objective_id')
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

    // Use current objective from shift if not provided in payload
    const finalObjectiveId = objective_id || activeShift.objective_id;

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
          latitude,
          longitude,
          accuracy,
          objective_id: finalObjectiveId,
          recorded_at: new Date().toISOString()
        })
      );
    }

    // 2. Update resource status and position for live map display
    const updatePayload: any = { 
      latitude, 
      longitude,
      accuracy,
      speed,
      heading,
      last_gps_update: new Date().toISOString(),
      status: 'activo' 
    };

    if (finalObjectiveId) {
      updatePayload.current_objective_id = finalObjectiveId;
    }

    let updateQuery = supabase.from('resources').update(updatePayload).eq('id', finalResourceId);
    tasks.push(updateQuery);

    // Execute in parallel mapping to catch potential errors without crashing the main flow
    await Promise.allSettled(tasks);

    return NextResponse.json({ success: true, recorded_at: updatePayload.last_gps_update });
  } catch (error: any) {
    console.error("Tracking Update Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
