import { createServiceClient } from '@/lib/supabase-server';
import { resolveTenantFromRequest } from '@/lib/resolve-tenant';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const {
      shift_id,
      operator_id,
      operator_name,
      objective_id,
      objective_name,
      latitude,
      longitude,
      distance,
      radius
    } = await request.json();

    if (!operator_id) {
      return NextResponse.json({ error: 'Missing operator_id' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const tenantCtx = await resolveTenantFromRequest(request);

    // 1. Resolve operator resource
    const { data: resource } = await supabase
      .from('resources')
      .select('id, name, tenant_id')
      .or(`id.eq.${operator_id},assigned_to.eq.${operator_id}`)
      .limit(1)
      .maybeSingle();

    const tenantId = tenantCtx?.tenantId || resource?.tenant_id || null;
    const finalOperatorName = operator_name || resource?.name || 'Operador';

    // 2. Update guard_shift status to outside geofence
    if (shift_id) {
      await supabase
        .from('guard_shifts')
        .update({
          geofence_status: 'outside',
          status: 'abandoned',
          notes: `⚠️ Alerta de Geocerca: Operador a ${Math.round(distance || 0)}m del puesto (Radio: ${radius || 100}m)`
        })
        .eq('id', shift_id);
    }

    // 3. Log urgent entry in guard_book_entries for manager dashboard
    const { data: incident } = await supabase
      .from('guard_book_entries')
      .insert({
        operator_id: resource?.id || operator_id,
        operator_name: finalOperatorName,
        objective_id: objective_id || null,
        entry_type: 'abandono_zona',
        urgency: 'alta',
        content: `🚨 ALERTA GEOCERCA: ${finalOperatorName} se encuentra fuera del rango permitido (${Math.round(distance || 0)}m del puesto "${objective_name || 'Asignado'}").`,
        latitude: latitude || 0,
        longitude: longitude || 0,
        tenant_id: tenantId,
        status: 'abierto'
      } as any)
      .select()
      .maybeSingle();

    // 4. Send Realtime broadcast alert payload to manager-tactical-alerts channel
    try {
      const channel = supabase.channel('manager-tactical-alerts');
      await channel.send({
        type: 'broadcast',
        event: 'geofence_breach',
        payload: {
          shift_id,
          operator_id: resource?.id || operator_id,
          operator_name: finalOperatorName,
          objective_id,
          objective_name,
          distance: Math.round(distance || 0),
          radius,
          latitude,
          longitude,
          timestamp: new Date().toISOString()
        }
      });
      await supabase.removeChannel(channel);
    } catch (e) {
      console.warn('[GEOFENCE_ALERT_API] Realtime broadcast notice:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Alerta de geocerca registrada y notificada a gerencia.',
      incident
    });
  } catch (error: any) {
    console.error('[GEOFENCE_ALERT_API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
