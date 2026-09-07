import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveTenantFromRequest } from '@/lib/resolve-tenant';

/**
 * GET    /api/tenants — Lista todos los tenants
 * PATCH  /api/tenants — Actualiza estado de un tenant (suspend/activate)
 * DELETE /api/tenants — Elimina permanentemente una empresa y todos sus datos
 */

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function isAuthorized(user: any): boolean {
  if (!user) return false;
  const role = (user.role || user.user_metadata?.role || '').toLowerCase();
  const email = (user.email || '').toLowerCase().trim();
  return (
    role === 'superadmin' ||
    email === 'sigpad.info@gmail.com' ||
    user.id === 'super-admin-master'
  );
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const ctx = await resolveTenantFromRequest(req);
  if (!ctx || (!ctx.isSuper && ctx.userEmail !== 'sigpad.info@gmail.com' && ctx.userRole !== 'superadmin')) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json({ tenants: [] });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('saas_tenant_metrics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tenants: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al obtener empresas' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = await resolveTenantFromRequest(req);
  if (!ctx || (!ctx.isSuper && ctx.userEmail !== 'sigpad.info@gmail.com' && ctx.userRole !== 'superadmin')) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const { tenantId, billing_status, plan_tier } = await req.json();
  if (!tenantId) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });

  // Si es un ID de demostración (ej: 'demo-1')
  if (!UUID_REGEX.test(tenantId)) {
    return NextResponse.json({ success: true, message: 'Estado actualizado en vista demo' });
  }

  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });
  }

  try {
    const updates: Record<string, string> = {};
    if (billing_status) updates.billing_status = billing_status;
    if (plan_tier) updates.plan_tier = plan_tier;

    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', tenantId);

    if (error) throw error;

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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al actualizar empresa' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const ctx = await resolveTenantFromRequest(req);
  if (!ctx || (!ctx.isSuper && ctx.userEmail !== 'sigpad.info@gmail.com' && ctx.userRole !== 'superadmin')) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });

  // Si es un ID de demostración (ej: 'demo-1', 'demo-2')
  if (!UUID_REGEX.test(tenantId)) {
    return NextResponse.json({ success: true, message: 'Empresa demo eliminada de la vista' });
  }

  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });
  }

  try {
    // Limpieza resiliente de tablas vinculadas por tenant_id
    const tables = [
      'guard_shifts',
      'guard_book_entries',
      'alarms',
      'objectives',
      'resources',
      'authorized_users',
      'billing_events',
      'users'
    ];

    for (const table of tables) {
      try {
        await supabaseAdmin.from(table).delete().eq('tenant_id', tenantId);
      } catch (e) {
        console.warn(`[DELETE_TENANT] Warning deleting from ${table}:`, e);
      }
    }

    // Eliminar la empresa maestra de la tabla tenants
    const { error } = await supabaseAdmin
      .from('tenants')
      .delete()
      .eq('id', tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Empresa eliminada correctamente' });
  } catch (error: any) {
    console.error('[DELETE_TENANT_ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Error al eliminar empresa' }, { status: 500 });
  }
}
