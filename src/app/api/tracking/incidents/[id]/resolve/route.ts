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
    const resolverName = body.resolver_name || body.author_name || 'Gerencia';
    const now = new Date().toISOString();

    const supabase = createServiceClient();
    let resolvedCount = 0;
    let operatorId: string | null = null;
    let objectiveId: string | null = null;
    let operatorName: string = '';
    let objectiveName: string = '';
    let tenantId: string | null = null;
    let lat: number = 0;
    let lng: number = 0;

    // 1. Intentar actualizar en 'incidents' y capturar metadata
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
        const inc = data[0];
        if (inc.operator_id) operatorId = inc.operator_id;
        if (inc.objective_id) objectiveId = inc.objective_id;
        if (inc.tenant_id) tenantId = inc.tenant_id;
        if (inc.latitude) lat = Number(inc.latitude);
        if (inc.longitude) lng = Number(inc.longitude);
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
        const entry = data[0];
        if (!operatorId && entry.operator_id) operatorId = entry.operator_id;
        if (!objectiveId && entry.objective_id) objectiveId = entry.objective_id;
        if (!tenantId && entry.tenant_id) tenantId = entry.tenant_id;
        if (!lat && entry.latitude) lat = Number(entry.latitude);
        if (!lng && entry.longitude) lng = Number(entry.longitude);
      }
    } catch (err) {}

    // 3. Intentar actualizar en 'alarms'
    try {
      const { data, error } = await supabase
        .from('alarms')
        .update({
          status: targetStatus === 'resuelto' ? 'resolved' : targetStatus,
          resolved_at: now,
          acknowledged_at: now
        })
        .eq('id', id)
        .select();
      
      if (!error && data && data.length > 0) {
        resolvedCount++;
        const alarm = data[0];
        if (!operatorId && (alarm.triggered_by || alarm.operator_id)) operatorId = alarm.triggered_by || alarm.operator_id;
        if (!objectiveId && alarm.objective_id) objectiveId = alarm.objective_id;
        if (!operatorName && alarm.operator_name) operatorName = alarm.operator_name;
        if (!objectiveName && alarm.objective_name) objectiveName = alarm.objective_name;
        if (!tenantId && alarm.tenant_id) tenantId = alarm.tenant_id;
      }
    } catch (err) {}

    // 4. Intentar actualizar en 'geofence_alerts'
    try {
      const { data, error } = await supabase
        .from('geofence_alerts')
        .update({
          resolved: true,
          resolved_at: now
        })
        .eq('id', id)
        .select();
      
      if (!error && data && data.length > 0) {
        resolvedCount++;
        const gAlert = data[0];
        if (!operatorId && gAlert.operator_id) operatorId = gAlert.operator_id;
        if (!objectiveId && gAlert.objective_id) objectiveId = gAlert.objective_id;
      }
    } catch (err) {}

    // Enriquecer datos faltantes de Operador y Objetivo
    if (operatorId && !operatorName) {
      const { data: res } = await supabase
        .from('resources')
        .select('name, tenant_id')
        .or(`id.eq.${operatorId},assigned_to.eq.${operatorId}`)
        .limit(1)
        .maybeSingle();
      if (res?.name) operatorName = res.name;
      if (!tenantId && res?.tenant_id) tenantId = res.tenant_id;
    }

    if (objectiveId && !objectiveName) {
      const { data: obj } = await supabase
        .from('objectives')
        .select('name, latitude, longitude, tenant_id')
        .eq('id', objectiveId)
        .maybeSingle();
      if (obj?.name) objectiveName = obj.name;
      if (!tenantId && obj?.tenant_id) tenantId = obj.tenant_id;
      if (!lat && obj?.latitude) lat = Number(obj.latitude);
      if (!lng && obj?.longitude) lng = Number(obj.longitude);
    }

    // 5. REGISTRO DE TRAZABILIDAD INTACAHBLE EN LIBRO DE NOVEDADES
    const opDisplayName = operatorName || 'Operador de Guardia';
    const objDisplayName = objectiveName || 'Puesto de Guardia';

    try {
      await supabase.from('guard_book_entries').insert({
        objective_id: objectiveId || null,
        operator_id: operatorId || null,
        entry_type: 'resolucion_alerta',
        content: `✅ ALERTA CONCLUIDA POR GERENCIA: Atendida por ${resolverName}. Operador involucrado: ${opDisplayName} (${objDisplayName}). ${comment ? `Notas: ${comment}` : ''}`,
        urgency: 'normal',
        latitude: lat,
        longitude: lng,
        created_at: now,
        tenant_id: tenantId,
        resolved_at: now
      });
    } catch (auditErr) {
      console.warn('[RESOLVE_AUDIT_LOG_WARNING]', auditErr);
    }

    return NextResponse.json({
      success: true,
      id,
      status: targetStatus,
      resolvedCount,
      audit: {
        resolver: resolverName,
        operator: opDisplayName,
        objective: objDisplayName
      }
    });
  } catch (error: any) {
    console.error('[RESOLVE_INCIDENT_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

