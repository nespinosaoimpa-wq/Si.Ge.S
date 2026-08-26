import { createServiceClient } from '@/lib/supabase-server';
import { isConfigured } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userCookie = request.cookies.get('SIGPAD_user');
    let tenantId: string | null = null;
    let isSuper = false;
    let userId: string | null = null;
    let userEmail: string | null = null;

    if (userCookie) {
      try {
        const user = JSON.parse(decodeURIComponent(userCookie.value));
        userId = user?.id;
        userEmail = user?.email;
        tenantId = user?.tenant_id || user?.user_metadata?.tenant_id;
        const userRole = (user?.role || user?.user_metadata?.role || '').toLowerCase();
        isSuper = (userRole === 'superadmin') && (!tenantId || tenantId === 'a1b2c3d4-0001-0001-0001-000000000001');
      } catch (e) {}
    }

    const supabase = createServiceClient();

    if (!tenantId && !isSuper && (userId || userEmail)) {
      try {
        if (userId) {
          const { data: dbUser } = await supabase.from('users').select('tenant_id').eq('id', userId).maybeSingle();
          if (dbUser?.tenant_id) tenantId = dbUser.tenant_id;
        }
        if (!tenantId && userEmail) {
          const { data: authU } = await supabase.from('authorized_users').select('tenant_id').ilike('email', userEmail).maybeSingle();
          if (authU?.tenant_id) tenantId = authU.tenant_id;
        }
        if (!tenantId && userEmail) {
          const { data: res } = await supabase.from('resources').select('tenant_id').ilike('email', userEmail).maybeSingle();
          if (res?.tenant_id) tenantId = res.tenant_id;
        }
        if (!tenantId && userEmail) {
          const { data: t } = await supabase.from('tenants').select('id').ilike('admin_email', userEmail).order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (t?.id) tenantId = t.id;
        }
      } catch {}
    }

    let monthlyIncome = 0;
    let payrollCost = 0;
    let growthProject = 0;
    let retentionRate = 100;
    let contracts: any[] = [];
    let documents: any[] = [];
    let isRealData = false;

    // 1. Fetch real totals from payroll/shifts if available
    let shiftsQuery = supabase
      .from('guard_shifts')
      .select(`
        duration_minutes,
        overtime_minutes,
        resources!operator_id ( hourly_pay_rate, salary ),
        objectives!objective_id ( hourly_billing_rate )
      `)
      .not('checkout_time', 'is', null);

    if (!isSuper && tenantId) {
      shiftsQuery = shiftsQuery.eq('tenant_id', tenantId);
    }

    const { data: shifts } = await shiftsQuery;

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

      monthlyIncome = Math.round(totalBilling);
      payrollCost = Math.round(totalPay);
    }

    // 2. Fetch contracts from contracts table
    let contractsQuery = supabase
      .from('contracts')
      .select('*, objectives(name)');

    if (!isSuper && tenantId) {
      contractsQuery = contractsQuery.eq('tenant_id', tenantId);
    }

    const { data: dbContracts, error: contractsError } = await contractsQuery;

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
          contractCode: `SIGPAD_CONTRACT_E_${String(index + 1).padStart(4, '0')}`
        };
      });
    } else {
      // Fallback: generate contracts from company's own objectives
      let objQuery = supabase
        .from('objectives')
        .select('id, name, hourly_billing_rate');

      if (!isSuper && tenantId) {
        objQuery = objQuery.eq('tenant_id', tenantId);
      }

      const { data: objectives } = await objQuery;

      if (objectives && objectives.length > 0) {
        contracts = objectives.map((obj: any, index: number) => {
          const calculatedMonthlyRate = Math.round((obj.hourly_billing_rate || 4500) * 160);
          const amount = `$${calculatedMonthlyRate.toLocaleString('es-AR')}`;
          
          return {
            id: obj.id,
            title: obj.name,
            amount,
            expiry: '31 DIC',
            status: 'Activo',
            contractCode: `SIGPAD_CONTRACT_O_${String(index + 1).padStart(4, '0')}`
          };
        });
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
