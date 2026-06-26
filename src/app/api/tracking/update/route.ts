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
    
    const { data: res } = await supabase
      .from('resources')
      .select('id, status')
      .or(`id.eq.${operator_id},assigned_to.eq.${operator_id}`)
      .limit(1)
      .maybeSingle();

    if (res) {
      finalResourceId = res.id;
      resourceStatus = res.status;
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
      // This protects the operator's privacy outside of working hours.
      return NextResponse.json({ 
        success: false, 
        warning: 'Transmission ignored: No active shift found for this resource. Privacy protected.' 
      });
    }

    // Use current objective from shift if not provided in payload
    const finalObjectiveId = objective_id || activeShift.objective_id;

    // 1. Prepare async tasks without awaiting them sequentially
    const tasks: any[] = [];

    // Track the log entry silently (no select needed)
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
