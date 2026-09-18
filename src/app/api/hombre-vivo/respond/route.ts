import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantFromRequest } from '@/lib/resolve-tenant';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { alarm_id, operator_id, objective_id, latitude, longitude } = body;

    const ctx = await resolveTenantFromRequest(req);
    let tenantId = ctx?.tenantId || null;

    const supabase = createServiceClient();
    const nowIso = new Date().toISOString();

    // 1. Resolve operator and tenant if not directly provided
    let finalOperatorId = operator_id;
    let operatorName = 'Operador';

    if (finalOperatorId) {
      const { data: res } = await supabase
        .from('resources')
        .select('id, name, tenant_id')
        .or(`id.eq.${finalOperatorId},assigned_to.eq.${finalOperatorId}`)
        .maybeSingle();

      if (res) {
        finalOperatorId = res.id;
        operatorName = res.name || operatorName;
        if (!tenantId && res.tenant_id) tenantId = res.tenant_id;
      }
    }

    if (!tenantId) {
      tenantId = '7f1fd036-6a82-47ab-aa2a-964c081e285b';
    }

    // 2. Mark specific alarm as acknowledged & resolved
    if (alarm_id && !alarm_id.startsWith('manual-') && !alarm_id.startsWith('push-')) {
      await supabase
        .from('alarms')
        .update({
          status: 'acknowledged',
          acknowledged_by: finalOperatorId || null,
          acknowledged_at: nowIso,
          resolved_at: nowIso
        })
        .eq('id', alarm_id);
    }

    // 3. Mark any other active Hombre Vivo alarms for this operator as acknowledged
    if (finalOperatorId) {
      await supabase
        .from('alarms')
        .update({
          status: 'acknowledged',
          acknowledged_by: finalOperatorId,
          acknowledged_at: nowIso,
          resolved_at: nowIso
        })
        .eq('status', 'active')
        .eq('triggered_by', finalOperatorId)
        .in('alarm_type', ['hombre_vivo_solicitud', 'hombre_vivo']);
    }

    // 4. Resolve pending requests in guard_book_entries for this operator so they don't linger in "sin responder"
    if (finalOperatorId) {
      // Find pending hombre vivo dispatches for this operator without resolved_at
      const { data: pendingEntries } = await supabase
        .from('guard_book_entries')
        .select('id, content')
        .eq('operator_id', finalOperatorId)
        .eq('entry_type', 'hombre_vivo')
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (pendingEntries && pendingEntries.length > 0) {
        for (const entry of pendingEntries) {
          await supabase
            .from('guard_book_entries')
            .update({
              resolved_at: nowIso,
              content: `${entry.content || 'Control de Hombre Vivo'} [CONFIRMADO POR OPERADOR: ${nowIso.substring(11, 16)} hs]`
            })
            .eq('id', entry.id);
        }
      }
    }

    // 5. Insert positive presence confirmation log into guard_book_entries
    const { data: newEntry, error: insertError } = await supabase
      .from('guard_book_entries')
      .insert({
        objective_id: objective_id || null,
        operator_id: finalOperatorId || null,
        tenant_id: tenantId,
        entry_type: 'hombre_vivo',
        content: `✅ CONTROL HOMBRE VIVO RESPONDIDO OK - PRESENCIA CONFIRMADA`,
        latitude: latitude || 0,
        longitude: longitude || 0,
        urgency: 'normal',
        resolved_at: nowIso,
        created_at: nowIso
      })
      .select()
      .single();

    if (insertError) {
      console.warn('[HOMBRE_VIVO_RESPOND] Guard book insert warning:', insertError);
    }

    // 6. Broadcast Realtime event to update manager dashboard immediately
    try {
      const channel = supabase.channel('hombre-vivo-broadcast-channel');
      await channel.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'hombre_vivo_answered',
            payload: {
              alarm_id: alarm_id || null,
              operator_id: finalOperatorId,
              operator_name: operatorName,
              objective_id: objective_id || null,
              timestamp: nowIso
            }
          });
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 1500);
        }
      });
    } catch (realtimeErr) {
      console.warn('[HOMBRE_VIVO_RESPOND] Realtime broadcast warning:', realtimeErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Presencia de Hombre Vivo confirmada y sincronizada',
      timestamp: nowIso
    });
  } catch (error: any) {
    console.error('[HOMBRE_VIVO_RESPOND_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error al confirmar presencia' }, { status: 500 });
  }
}
