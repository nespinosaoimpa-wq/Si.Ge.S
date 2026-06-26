import { createServiceClient } from '@/lib/supabase-server';
import { isConfigured } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    let monthlyIncome = 18400000; // 18.4M ARS
    let payrollCost = 9200000;    // 9.2M ARS
    let growthProject = 31.2;
    let retentionRate = 98.4;

    let contracts = [
      { id: 1, title: 'Consorcio Portofino', amount: '$1.450.000', expiry: '15 MAY', status: 'Pagado', contractCode: 'SIGES_CONTRACT_E_9201' },
      { id: 2, title: 'Barrio Torremolinos', amount: '$2.180.000', expiry: '12 JUN', status: 'Facturado', contractCode: 'SIGES_CONTRACT_E_9202' },
      { id: 3, title: 'Planta Industrial Norte', amount: '$3.500.000', expiry: '05 MAY', status: 'Vencido', contractCode: 'SIGES_CONTRACT_E_9203' },
      { id: 4, title: 'Edificio Las Marías', amount: '$1.050.000', expiry: '20 MAY', status: 'Pagado', contractCode: 'SIGES_CONTRACT_E_9204' },
      { id: 5, title: 'Centro Comercial Si.Ge.S', amount: '$5.400.000', expiry: '01 JUN', status: 'Facturado', contractCode: 'SIGES_CONTRACT_E_9205' },
    ];

    let documents = [
      { name: 'Plan_Evacuacion_Oct_24.pdf', size: '2.4 MB', type: 'pdf', uploaded_at: '12 MIN AGO' },
      { name: 'Contrato_SIGES_Portofino.pdf', size: '1.2 MB', type: 'pdf', uploaded_at: '12 MIN AGO' },
    ];

    let isRealData = false;

    if (isConfigured) {
      const supabase = createServiceClient();

      // 1. Fetch real totals from payroll/shifts if available
      const { data: shifts } = await supabase
        .from('guard_shifts')
        .select(`
          duration_minutes,
          overtime_minutes,
          resources!operator_id ( hourly_pay_rate, salary ),
          objectives!objective_id ( hourly_billing_rate )
        `)
        .not('checkout_time', 'is', null);

      if (shifts && shifts.length > 0) {
        isRealData = true;
        let totalBilling = 0;
        let totalPay = 0;

        shifts.forEach((shift: any) => {
          const hours = (shift.duration_minutes || 0) / 60;
          const billingRate = parseFloat(shift.objectives?.hourly_billing_rate || 4500);
          const payRate = parseFloat(shift.resources?.hourly_pay_rate || shift.resources?.salary || 3500);

          totalBilling += hours * billingRate;
          totalPay += hours * payRate;
        });

        if (totalBilling > 0) {
          monthlyIncome = Math.round(totalBilling);
        }
        if (totalPay > 0) {
          payrollCost = Math.round(totalPay);
        }
      }

      // 2. Fetch contracts from contracts table
      const { data: dbContracts, error: contractsError } = await supabase
        .from('contracts')
        .select('*, objectives(name)');

      if (!contractsError && dbContracts && dbContracts.length > 0) {
        isRealData = true;
        contracts = dbContracts.map((c: any, index: number) => {
          const amount = c.monthly_rate 
            ? `$${parseFloat(c.monthly_rate).toLocaleString('es-AR')}`
            : '$0';
          
          let formattedDate = 'PENDIENTE';
          if (c.end_date) {
            const d = new Date(c.end_date);
            const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
            formattedDate = `${d.getDate()} ${months[d.getMonth()]}`;
          }

          let status = 'Facturado';
          if (c.status === 'expired') status = 'Vencido';
          else if (c.status === 'inactive') status = 'Inactivo';
          else if (c.status === 'active') status = 'Pagado';

          return {
            id: c.id,
            title: c.client_name || c.objectives?.name || 'Cliente General',
            amount,
            expiry: formattedDate,
            status,
            contractCode: `SIGES_CONTRACT_E_${String(index + 1).padStart(4, '0')}`
          };
        });
      } else {
        // Fallback: If contracts table is empty, we can try to generate contracts from objectives
        const { data: objectives } = await supabase
          .from('objectives')
          .select('id, name, hourly_billing_rate');

        if (objectives && objectives.length > 0) {
          contracts = objectives.map((obj: any, index: number) => {
            const calculatedMonthlyRate = Math.round((obj.hourly_billing_rate || 4500) * 160); // 160 hrs/month
            const amount = `$${calculatedMonthlyRate.toLocaleString('es-AR')}`;
            
            const expiryDates = ['15 MAY', '12 JUN', '05 MAY', '20 MAY', '01 JUN'];
            const statuses = ['Pagado', 'Facturado', 'Vencido', 'Pagado', 'Facturado'];

            return {
              id: obj.id,
              title: obj.name,
              amount,
              expiry: expiryDates[index % expiryDates.length],
              status: statuses[index % statuses.length],
              contractCode: `SIGES_CONTRACT_O_${String(index + 1).padStart(4, '0')}`
            };
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      isRealData,
      totals: {
        monthlyIncome,
        payrollCost,
        growthProject,
        retentionRate
      },
      contracts,
      documents
    });
  } catch (error: any) {
    console.error('[FINANCES_API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
