import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET    /api/tenants — Lista todos los tenants
 * PATCH  /api/tenants — Actualiza estado de un tenant (suspend/activate)
 * DELETE /api/tenants — Elimina permanentemente una empresa y todos sus datos
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

  const supabaseAdmin = getAdminClient();
  const { data, error } = await supabaseAdmin
    .from('saas_tenant_metrics')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tenants: data });
}

export async function PATCH(req: NextRequest) {
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

  const supabaseAdmin = getAdminClient();
  const { tenantId, billing_status, plan_tier } = await req.json();
  if (!tenantId) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });

  const updates: Record<string, string> = {};
  if (billing_status) updates.billing_status = billing_status;
  if (plan_tier) updates.plan_tier = plan_tier;

  const { error } = await supabaseAdmin
    .from('tenants')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (billing_status) {
    const eventMap: Record<string, string> = {
      suspended: 'account_suspended',
      active: 'account_reactivated',
    };
    const eventType = eventMap[billing_status];
    if (eventType) {
      await supabaseAdmin.from('billing_events').insert({
        tenant_id: tenantId,
        event_type: eventType,
      });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });

  const supabaseAdmin = getAdminClient();

  try {
    // 1. Limpieza de datos vinculados
    await supabaseAdmin.from('guard_shifts').delete().eq('tenant_id', tenantId);
    await supabaseAdmin.from('guard_book_entries').delete().eq('tenant_id', tenantId);
    await supabaseAdmin.from('alarms').delete().eq('tenant_id', tenantId);
    await supabaseAdmin.from('objectives').delete().eq('tenant_id', tenantId);
    await supabaseAdmin.from('resources').delete().eq('tenant_id', tenantId);
    await supabaseAdmin.from('authorized_users').delete().eq('tenant_id', tenantId);
    await supabaseAdmin.from('billing_events').delete().eq('tenant_id', tenantId);
    await supabaseAdmin.from('users').delete().eq('tenant_id', tenantId);

    // 2. Eliminar empresa principal
    const { error } = await supabaseAdmin
      .from('tenants')
      .delete()
      .eq('id', tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Empresa eliminada correctamente' });
  } catch (error: any) {
    console.error('[DELETE_TENANT_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
