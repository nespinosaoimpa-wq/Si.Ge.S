import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      body = {};
    }

    const targetStatus = body.status || 'resolved';
    const comment = body.comment || 'Resuelto por gerencia';
    const now = new Date().toISOString();

    const supabase = createServiceClient();
    let resolvedCount = 0;

    // 1. Intentar actualizar en 'incidents'
    try {
      const { data, error } = await supabase
        .from('incidents')
        .update({
          status: targetStatus,
          resolved_at: now
        })
        .eq('id', id)
        .select();
      
      if (!error && data && data.length > 0) {
        resolvedCount++;
      }
    } catch (err) {}

    // 2. Intentar actualizar en 'guard_book_entries'
    try {
      const { data, error } = await supabase
        .from('guard_book_entries')
        .update({
          status: targetStatus,
          resolved_at: now
        })
        .eq('id', id)
        .select();
      
      if (!error && data && data.length > 0) {
        resolvedCount++;
      }
    } catch (err) {}

    // 3. Intentar actualizar en 'alarms'
    try {
      const { data, error } = await supabase
        .from('alarms')
        .update({
          status: targetStatus === 'resuelto' ? 'resolved' : targetStatus,
          resolved_at: now
        })
        .eq('id', id)
        .select();
      
      if (!error && data && data.length > 0) {
        resolvedCount++;
      }
    } catch (err) {}

    // 4. Intentar actualizar en 'geofencing_incidents'
    try {
      const { data, error } = await supabase
        .from('geofencing_incidents')
        .update({
          status: targetStatus === 'resolved' ? 'resuelto' : targetStatus,
          supervisor_comment: comment,
          return_at: now
        })
        .eq('id', id)
        .select();
      
      if (!error && data && data.length > 0) {
        resolvedCount++;
      }
    } catch (err) {}

    return NextResponse.json({
      success: true,
      id,
      status: targetStatus,
      resolvedCount
    });
  } catch (error: any) {
    console.error('[RESOLVE_INCIDENT_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
