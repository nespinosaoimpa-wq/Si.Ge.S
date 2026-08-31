import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantFromRequest } from '@/lib/resolve-tenant';

export async function GET(req: NextRequest) {
  try {
    const ctx = await resolveTenantFromRequest(req);
    if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { tenantId, isSuper } = ctx;

    const supabase = createServiceClient();

    // 1. Fetch active resources / operators for the current tenant
    let guardsQuery = supabase
      .from('resources')
      .select('id, name, role, status, current_objective_id, objectives(name)')
      .neq('status', 'baja')
      .order('name', { ascending: true });

    if (!isSuper && tenantId) {
      guardsQuery = guardsQuery.eq('tenant_id', tenantId);
    }

    const { data: guards, error: guardsErr } = await guardsQuery;
    if (guardsErr) console.warn('[HOMBRE_VIVO_GET] Guards query error:', guardsErr.message);

    // 2. Fetch Hombre Vivo checks / alarms
    let alarmsQuery = supabase
      .from('alarms')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!isSuper && tenantId) {
      alarmsQuery = alarmsQuery.eq('tenant_id', tenantId);
    }

    const { data: alarmsData, error: alarmsErr } = await alarmsQuery;
    if (alarmsErr) console.warn('[HOMBRE_VIVO_GET] Alarms query error:', alarmsErr.message);

    // Filter alarms related to hombre_vivo or panic
    const hvAlarms = (alarmsData || []).filter((a: any) => 
      a.alarm_type === 'hombre_vivo' || a.alarm_type === 'panico' || a.alarm_type === 'sos_panic' || (a.message || '').toLowerCase().includes('hombre vivo')
    );

    // Format checks list
    const formattedChecks = hvAlarms.map((a: any) => {
      const createdAt = new Date(a.created_at || Date.now());
      const elapsedMinutes = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60));
      
      let status: 'sin_responder' | 'respondido' | 'resuelto' = 'sin_responder';
      if (a.status === 'resolved' || a.status === 'resuelto' || (a.message || '').includes('[RESUELTO')) {
        status = 'resuelto';
      } else if (a.status === 'acknowledged' || a.status === 'respondido') {
        status = 'respondido';
      }

      return {
        id: a.id,
        created_at: a.created_at,
        operator_id: a.triggered_by || 'Operador',
        operator_name: a.triggered_by || 'Operador',
        objective_id: a.objective_id,
        objective_name: a.objective_name || 'Objetivo',
        status,
        time_elapsed_minutes: elapsedMinutes,
        latitude: a.latitude,
        longitude: a.longitude,
        notes: a.message || 'Control de presencia Hombre Vivo',
        urgency: 'alta'
      };
    });

    return NextResponse.json({
      activeGuards: guards || [],
      checks: formattedChecks
    });
  } catch (err: any) {
    console.error('[HOMBRE_VIVO_GET_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveTenantFromRequest(req);
    if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { tenantId, isSuper } = ctx;

    const body = await req.json();
    const { operator_id, objective_id, operator_name } = body;

    if (!operator_id) {
      return NextResponse.json({ error: 'operator_id es requerido' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const targetTenantId = isSuper ? (body.tenant_id || tenantId) : tenantId;

    // Fetch operator details if name not provided
    let finalOperatorName = operator_name;
    let finalObjectiveId = objective_id;
    let finalObjectiveName = 'Objetivo de Guardia';

    if (!finalOperatorName || !finalObjectiveId) {
      const { data: resData } = await supabase
        .from('resources')
        .select('name, current_objective_id, objectives(name)')
        .eq('id', operator_id)
        .maybeSingle();

      if (resData) {
        if (!finalOperatorName) finalOperatorName = resData.name;
        if (!finalObjectiveId) finalObjectiveId = resData.current_objective_id;
        if ((resData as any).objectives?.name) finalObjectiveName = (resData as any).objectives.name;
      }
    }

    if (finalObjectiveId && finalObjectiveName === 'Objetivo de Guardia') {
      const { data: objData } = await supabase
        .from('objectives')
        .select('name')
        .eq('id', finalObjectiveId)
        .maybeSingle();
      if (objData?.name) finalObjectiveName = objData.name;
    }

    // 1. Create alarm record
    const alarmRecord = {
      triggered_by: finalOperatorName || operator_id,
      objective_id: finalObjectiveId || null,
      objective_name: finalObjectiveName,
      alarm_type: 'hombre_vivo',
      message: `⚡ CONTROL DE HOMBRE VIVO REQUERIDO: ${finalOperatorName || 'Operador'} en ${finalObjectiveName}`,
      status: 'active',
      tenant_id: targetTenantId || null,
      created_at: new Date().toISOString()
    };

    const { data: insertedAlarm, error: alarmErr } = await supabase
      .from('alarms')
      .insert(alarmRecord)
      .select()
      .single();

    if (alarmErr) console.warn('[HOMBRE_VIVO_DISPATCH] Alarm insert warning:', alarmErr.message);

    // 2. Insert into guard_book_entries for auditing
    try {
      await supabase.from('guard_book_entries').insert({
        objective_id: finalObjectiveId || null,
        operator_id: operator_id,
        entry_type: 'hombre_vivo',
        content: `🚨 HOMBRE VIVO MANUAL SOLICITADO POR GERENCIA PARA ${finalOperatorName || operator_id}`,
        urgency: 'alta',
        tenant_id: targetTenantId || null,
        created_at: new Date().toISOString()
      });
    } catch (gErr: any) {
      console.warn('[HOMBRE_VIVO_DISPATCH] Guard book insert warning:', gErr.message);
    }

    return NextResponse.json({
      success: true,
      alarm: insertedAlarm || alarmRecord
    });
  } catch (err: any) {
    console.error('[HOMBRE_VIVO_POST_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
