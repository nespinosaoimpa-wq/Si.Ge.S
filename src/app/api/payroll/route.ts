import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { resolveTenantFromRequest } from '@/lib/resolve-tenant'

export const dynamic = 'force-dynamic'

/**
 * GET /api/payroll?start_date=&end_date=&operator_id=&view=nomina|facturacion
 *
 * Retorna doble payload:
 *  - nomina: horas × hourly_pay_rate del operador (para pago de sueldo)
 *  - facturacion: horas × hourly_billing_rate del objetivo (para factura al cliente)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date') ?? searchParams.get('from')
    const endDate = searchParams.get('end_date') ?? searchParams.get('to')
    const operatorId = searchParams.get('operator_id')
    const view = searchParams.get('view') ?? 'nomina' // 'nomina' | 'facturacion' | 'ambos'

    const ctx = await resolveTenantFromRequest(request);
    let tenantId = ctx?.tenantId || null;
    let isSuper = ctx?.isSuper || false;

    if (!tenantId && !isSuper) {
      tenantId = 'a1b2c3d4-0001-0001-0001-000000000001';
    }

    let query = supabase
      .from('guard_shifts')
      .select(
        `
        *,
        resources!operator_id ( * ),
        objectives!objective_id ( * )
      `
      )
      .order('checkin_time', { ascending: false });

    if (!isSuper && tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    }

    if (operatorId) query = query.eq('operator_id', operatorId);
    if (startDate) query = query.gte('checkin_time', `${startDate}T00:00:00.000Z`);
    if (endDate)   query = query.lte('checkin_time', `${endDate}T23:59:59.999Z`);

    let { data: shifts, error } = await query;
    
    if (error) {
      console.warn('[PAYROLL_GET] Join error, falling back to simple query:', error.message);
      let fallbackQuery = supabase.from('guard_shifts').select('*').order('checkin_time', { ascending: false });
      if (!isSuper && tenantId) fallbackQuery = fallbackQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      if (operatorId) fallbackQuery = fallbackQuery.eq('operator_id', operatorId);
      if (startDate) fallbackQuery = fallbackQuery.gte('checkin_time', `${startDate}T00:00:00.000Z`);
      if (endDate) fallbackQuery = fallbackQuery.lte('checkin_time', `${endDate}T23:59:59.999Z`);
      const fb = await fallbackQuery;
      shifts = fb.data;
    }

    const rows = (shifts ?? []).map((shift: any) => {
      // Use stored total_hours from checkout (accurate) or calculate if missing (legacy or active)
      let totalHours = shift.total_hours;
      const checkIn = shift.checkin_time ? new Date(shift.checkin_time) : new Date();
      const checkOut = shift.checkout_time ? new Date(shift.checkout_time) : new Date();

      if (totalHours === null || totalHours === undefined || totalHours === 0 || !shift.checkout_time) {
        const durationMs = Math.max(0, checkOut.getTime() - checkIn.getTime());
        totalHours = parseFloat((durationMs / 3_600_000).toFixed(4));
      }
      
      const totalMinutes = Math.round(totalHours * 60);

      // Tarifa de nómina (pago al operador)
      const payRate: number = parseFloat(shift.resources?.hourly_pay_rate ?? shift.resources?.salary ?? 3500)
      const payAmount = parseFloat((totalHours * payRate).toFixed(2))

      // Tarifa de facturación (cobro al cliente por el objetivo)
      const billingRate: number = parseFloat(shift.objectives?.hourly_billing_rate ?? 4500)
      const billingAmount = parseFloat((totalHours * billingRate).toFixed(2))

      return {
        id: shift.id,
        // Personal
        operator_id: shift.operator_id,
        operator_name: shift.resources?.name ?? 'Operador Desconocido',
        operator_role: shift.resources?.role ?? 'Guardia',
        // Objetivo
        objective_id: shift.objective_id,
        objective_name: shift.objectives?.name ?? 'Puesto General',
        // Tiempos — usamos los nombres correctos de columna hacia afuera también
        checkin_time:  shift.checkin_time,
        checkout_time: shift.checkout_time,
        total_minutes: totalMinutes,
        total_hours: totalHours,
        // Nómina
        hourly_pay_rate: payRate,
        pay_amount: payAmount,
        // Facturación
        hourly_billing_rate: billingRate,
        billing_amount: billingAmount,
      }
    })

    // Resumen agrupado por operador (para nómina mensual)
    const nominaByOperator: Record<string, any> = {}
    rows.forEach((r) => {
      if (!nominaByOperator[r.operator_id]) {
        nominaByOperator[r.operator_id] = {
          operator_id: r.operator_id,
          operator_name: r.operator_name,
          operator_role: r.operator_role,
          hourly_pay_rate: r.hourly_pay_rate,
          total_hours: 0,
          total_pay: 0,
          shifts_count: 0,
        }
      }
      nominaByOperator[r.operator_id].total_hours = parseFloat(
        (nominaByOperator[r.operator_id].total_hours + r.total_hours).toFixed(4)
      )
      nominaByOperator[r.operator_id].total_pay = parseFloat(
        (nominaByOperator[r.operator_id].total_pay + r.pay_amount).toFixed(2)
      )
      nominaByOperator[r.operator_id].shifts_count++
    })

    // Resumen agrupado por objetivo (para facturación al cliente)
    const facturacionByObjective: Record<string, any> = {}
    rows.forEach((r) => {
      if (!facturacionByObjective[r.objective_id]) {
        facturacionByObjective[r.objective_id] = {
          objective_id: r.objective_id,
          objective_name: r.objective_name,
          hourly_billing_rate: r.hourly_billing_rate,
          total_hours: 0,
          total_billing: 0,
          shifts_count: 0,
          operators: new Set<string>(),
        }
      }
      facturacionByObjective[r.objective_id].total_hours = parseFloat(
        (facturacionByObjective[r.objective_id].total_hours + r.total_hours).toFixed(4)
      )
      facturacionByObjective[r.objective_id].total_billing = parseFloat(
        (facturacionByObjective[r.objective_id].total_billing + r.billing_amount).toFixed(2)
      )
      facturacionByObjective[r.objective_id].shifts_count++
      facturacionByObjective[r.objective_id].operators.add(r.operator_name)
    })

    // Serialize Sets to Arrays
    const facturacionArray = Object.values(facturacionByObjective).map((o: any) => ({
      ...o,
      operators: Array.from(o.operators),
    }))

    return NextResponse.json({
      shifts: rows,
      nomina: Object.values(nominaByOperator),
      facturacion: facturacionArray,
      totals: {
        total_hours: parseFloat(rows.reduce((s, r) => s + r.total_hours, 0).toFixed(4)),
        total_pay: parseFloat(rows.reduce((s, r) => s + r.pay_amount, 0).toFixed(2)),
        total_billing: parseFloat(rows.reduce((s, r) => s + r.billing_amount, 0).toFixed(2)),
        shifts_count: rows.length,
      },
    })
  } catch (error: any) {
    console.error('[PAYROLL] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
