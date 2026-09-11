import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Coverage & Keep-Alive Audit Worker
 * Identifies active operators whose last_gps_update is older than thresholdMinutes (default 5 min).
 * Updates their online status to 'sin_cobertura' / 'offline' and emits a preventive alarm to central monitoring.
 */
export async function auditStaleOperatorCoverage(
  supabase: SupabaseClient,
  tenantId?: string,
  thresholdMinutes: number = 5
) {
  try {
    const staleCutoff = new Date(Date.now() - thresholdMinutes * 60 * 1000).toISOString();

    // 1. Query active guard shifts with checkin_time and no checkout_time
    let shiftQuery = supabase
      .from('guard_shifts')
      .select('id, operator_id, objective_id, tenant_id, checkin_time')
      .is('checkout_time', null)
      .in('status', ['activo', 'active']);

    if (tenantId) {
      shiftQuery = shiftQuery.eq('tenant_id', tenantId);
    }

    const { data: activeShifts, error: shiftErr } = await shiftQuery;
    if (shiftErr || !activeShifts || activeShifts.length === 0) return [];

    const operatorIds = Array.from(new Set(activeShifts.map((s: any) => s.operator_id).filter(Boolean)));
    if (operatorIds.length === 0) return [];

    // 2. Query resources for active operators
    let resourceQuery = supabase
      .from('resources')
      .select('id, name, status, last_gps_update, current_objective_id, tenant_id, performance_data')
      .in('id', operatorIds);

    if (tenantId) {
      resourceQuery = resourceQuery.eq('tenant_id', tenantId);
    }

    const { data: resources, error: resErr } = await resourceQuery;
    if (resErr || !resources || resources.length === 0) return [];

    // Filter operators without GPS update in the last X minutes
    const staleOperators = resources.filter((res: any) => {
      if (res.status === 'baja') return false;
      const lastUpdate = res.last_gps_update;
      if (!lastUpdate) return true; // Has active shift but zero pulses recorded yet
      return new Date(lastUpdate).getTime() < new Date(staleCutoff).getTime();
    });

    if (staleOperators.length === 0) return [];

    // 3. Update status to 'sin_cobertura' and insert preventive central alarm (deduplicated by 15 min window)
    const last15min = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const alarmsToInsert: any[] = [];

    for (const op of staleOperators) {
      const shift = activeShifts.find((s: any) => s.operator_id === op.id);
      const objId = op.current_objective_id || shift?.objective_id;
      const opTenantId = op.tenant_id || shift?.tenant_id;

      // Update operator performance_data network_audit
      let perfData = op.performance_data || {};
      if (Array.isArray(perfData)) perfData = { history: perfData };
      perfData.network_audit = {
        ...(perfData.network_audit || {}),
        online_status: 'offline',
        stale_detected_at: new Date().toISOString()
      };

      await supabase
        .from('resources')
        .update({
          status: 'sin_cobertura',
          performance_data: perfData
        })
        .eq('id', op.id);

      // Deduplicate alarm insertion in the last 15 minutes
      const { data: existingAlarm } = await supabase
        .from('alarms')
        .select('id')
        .eq('triggered_by', op.id)
        .eq('alarm_type', 'perdida_cobertura')
        .gte('created_at', last15min)
        .limit(1)
        .maybeSingle();

      if (!existingAlarm) {
        alarmsToInsert.push({
          triggered_by: op.id,
          operator_id: op.id,
          objective_id: objId || null,
          alarm_type: 'perdida_cobertura',
          message: `🚨 ALERTA SIN COBERTURA: Operador ${op.name || 'Guardia'} sin señal/pulso GPS desde hace más de ${thresholdMinutes} minutos.`,
          status: 'active',
          tenant_id: opTenantId || null
        });
      }
    }

    if (alarmsToInsert.length > 0) {
      await supabase.from('alarms').insert(alarmsToInsert);
    }

    return staleOperators;
  } catch (err) {
    console.error('[STALE_COVERAGE_WORKER_ERROR]', err);
    return [];
  }
}
