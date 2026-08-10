import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/superadmin/audit
 * Retorna logs de auditoría global para el Super Admin:
 * - Historial de eventos de membresías y cobros (billing_events).
 * - Últimos fichajes / check-ins activos de guardias en el sistema.
 * - Alarmas críticas disparadas globalmente.
 */

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin credentials not configured.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function isAuthorized(user: any): boolean {
  if (!user) return false;
  const role = (user.role || user.user_metadata?.role || '').toLowerCase();
  const email = (user.email || '').toLowerCase().trim();
  return (
    role === 'superadmin' ||
    role === 'gerente' ||
    email === 'nespinosa.oimpa@gmail.com' ||
    user.id === 'super-admin-master' ||
    user.id === 'demo-user'
  );
}

export async function GET(req: NextRequest) {
  const userCookie = req.cookies.get('SIGPAD_user');
  if (!userCookie) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const user = JSON.parse(decodeURIComponent(userCookie.value));
    if (!isAuthorized(user)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  try {
    const supabaseAdmin = getAdminClient();

    // 1. Fetch recent billing events with tenant names
    const { data: billingEvents, error: billingError } = await supabaseAdmin
      .from('billing_events')
      .select('*, tenants(name)')
      .order('created_at', { ascending: false })
      .limit(30);

    if (billingError) throw billingError;

    // 2. Fetch recent guard shift activities globally (checkin / checkout)
    const { data: recentShifts, error: shiftsError } = await supabaseAdmin
      .from('guard_shifts')
      .select('*, resources(name), objectives(name), tenants(name)')
      .order('checkin_time', { ascending: false })
      .limit(20);

    if (shiftsError) throw shiftsError;

    // 3. Fetch recent critical alarms globally
    const { data: criticalAlarms, error: alarmsError } = await supabaseAdmin
      .from('alarms')
      .select('*, objectives(name), tenants(name)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (alarmsError) throw alarmsError;

    return NextResponse.json({
      billingEvents: billingEvents || [],
      recentShifts: recentShifts || [],
      criticalAlarms: criticalAlarms || [],
    });
  } catch (err: any) {
    console.error('[SuperAdmin Audit API] Error fetching logs:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
