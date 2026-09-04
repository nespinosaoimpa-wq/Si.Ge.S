import { createServiceClient } from '@/lib/supabase-server';
import { resolveTenantFromRequest } from '@/lib/resolve-tenant';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function normalizeRole(r?: string): string {
  if (!r) return 'operador';
  const lower = r.toLowerCase().trim();
  if (lower.includes('gerente') || lower.includes('admin') || lower === 'supervisor') return 'gerente';
  if (lower.includes('cliente') || lower.includes('vip')) return 'cliente';
  return 'operador';
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const tenant = await resolveTenantFromRequest(req);

    let authQuery = supabase.from('authorized_users').select('*').order('created_at', { ascending: false });
    let resQuery = supabase.from('resources').select('id, name, email, role, status, created_at, tenant_id').order('created_at', { ascending: false });
    let usersQuery = supabase.from('users').select('id, email, role, tenant_id').order('created_at', { ascending: false });

    // Enforce strict tenant separation for non-super managers
    if (tenant && !tenant.isSuper) {
      if (!tenant.tenantId) {
        return NextResponse.json([]);
      }
      authQuery = authQuery.eq('tenant_id', tenant.tenantId);
      resQuery = resQuery.eq('tenant_id', tenant.tenantId);
      usersQuery = usersQuery.eq('tenant_id', tenant.tenantId);
    }

    const [authRes, resRes, usersRes] = await Promise.all([
      authQuery,
      resQuery,
      Promise.resolve(usersQuery).catch(() => ({ data: [], error: null }))
    ]);

    const emailMap = new Map<string, any>();

    // 1. Primary Source of Truth: authorized_users
    (authRes.data || []).forEach((u: any) => {
      if (u.email) {
        const em = u.email.toLowerCase().trim();
        emailMap.set(em, {
          id: u.id,
          email: u.email,
          name: u.email.split('@')[0],
          role: normalizeRole(u.role),
          status: u.status || 'approved',
          tenant_id: u.tenant_id,
          source: 'authorized_users',
          created_at: u.created_at || new Date().toISOString()
        });
      }
    });

    // 2. Secondary Source: resources (only set if not present in authorized_users)
    (resRes.data || []).forEach((r: any) => {
      if (r.email) {
        const em = r.email.toLowerCase().trim();
        if (!emailMap.has(em)) {
          emailMap.set(em, {
            id: r.id,
            email: r.email,
            name: r.name || r.email.split('@')[0],
            role: normalizeRole(r.role),
            status: r.status === 'inactive' || r.status === 'baja' ? 'revoked' : 'approved',
            tenant_id: r.tenant_id,
            source: 'resources',
            created_at: r.created_at || new Date().toISOString()
          });
        } else {
          const existing = emailMap.get(em);
          if (r.name) existing.name = r.name;
        }
      }
    });

    // 3. Fallback: users table
    ((usersRes as any)?.data || []).forEach((u: any) => {
      if (u.email) {
        const em = u.email.toLowerCase().trim();
        if (!emailMap.has(em)) {
          emailMap.set(em, {
            id: u.id,
            email: u.email,
            name: u.email.split('@')[0],
            role: normalizeRole(u.role),
            status: 'approved',
            tenant_id: u.tenant_id,
            source: 'users',
            created_at: new Date().toISOString()
          });
        }
      }
    });

    const combinedUsers = Array.from(emailMap.values());
    return NextResponse.json(combinedUsers, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error: any) {
    console.error('[ACCESOS_GET_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const tenant = await resolveTenantFromRequest(request);
    const { email, role } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const targetRole = normalizeRole(role);
    const dbResRole = targetRole === 'gerente' ? 'Gerente' : 'vigilador';
    const activeTenantId = (tenant && tenant.tenantId) ? tenant.tenantId : '7f1fd036-6a82-47ab-aa2a-964c081e285b';

    // 1. Upsert into authorized_users
    const { data: authData, error: authError } = await supabase
      .from('authorized_users')
      .upsert({
        email: cleanEmail,
        role: targetRole,
        status: 'approved',
        tenant_id: activeTenantId,
        approved_at: new Date().toISOString()
      }, { onConflict: 'email' })
      .select()
      .single();

    if (authError) {
      console.error('[ACCESOS_POST] authorized_users error:', authError);
    }

    // 2. Update resources table
    await supabase
      .from('resources')
      .update({
        role: dbResRole,
        status: 'active',
        tenant_id: activeTenantId
      })
      .ilike('email', cleanEmail);

    // 3. Update users table if user registered previously
    await supabase
      .from('users')
      .update({ role: targetRole, tenant_id: activeTenantId })
      .ilike('email', cleanEmail);

    // 4. Update Supabase Auth user metadata
    try {
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers?.users?.find(u => u.email?.toLowerCase().trim() === cleanEmail);
      if (authUser?.id) {
        await supabase.auth.admin.updateUserById(authUser.id, {
          user_metadata: { ...authUser.user_metadata, role: targetRole, tenant_id: activeTenantId }
        });
      }
    } catch (e) {}

    return NextResponse.json({ success: true, user: authData });
  } catch (error: any) {
    console.error('[ACCESOS_POST_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const tenant = await resolveTenantFromRequest(request);
    const { email, id, role, status } = await request.json();

    if (!email && !id) {
      return NextResponse.json({ error: 'Email or ID is required' }, { status: 400 });
    }

    let cleanEmail = email ? email.toLowerCase().trim() : null;

    if (!cleanEmail && id) {
      const { data: aUser } = await supabase.from('authorized_users').select('email').eq('id', id).maybeSingle();
      if (aUser?.email) cleanEmail = aUser.email.toLowerCase().trim();
      if (!cleanEmail) {
        const { data: rUser } = await supabase.from('resources').select('email').eq('id', id).maybeSingle();
        if (rUser?.email) cleanEmail = rUser.email.toLowerCase().trim();
      }
    }

    const targetRole = role ? normalizeRole(role) : undefined;
    const dbResRole = targetRole ? (targetRole === 'gerente' ? 'Gerente' : 'vigilador') : undefined;

    const authUpdateData: any = {};
    if (targetRole) authUpdateData.role = targetRole;
    if (status !== undefined) {
      authUpdateData.status = status;
      if (status === 'approved') authUpdateData.approved_at = new Date().toISOString();
    }

    let authQuery = supabase.from('authorized_users').update(authUpdateData);
    if (tenant && !tenant.isSuper && tenant.tenantId) {
      authQuery = authQuery.eq('tenant_id', tenant.tenantId);
    }
    if (id) {
      await authQuery.eq('id', id);
    } else if (cleanEmail) {
      await authQuery.ilike('email', cleanEmail);
    }

    if (cleanEmail) {
      const resUpdate: any = {};
      if (dbResRole) resUpdate.role = dbResRole;
      if (status !== undefined) resUpdate.status = status === 'approved' ? 'active' : 'inactive';

      let resQuery = supabase.from('resources').update(resUpdate).ilike('email', cleanEmail);
      if (tenant && !tenant.isSuper && tenant.tenantId) {
        resQuery = resQuery.eq('tenant_id', tenant.tenantId);
      }
      await resQuery;

      let userQuery = supabase.from('users').update({ role: targetRole }).ilike('email', cleanEmail);
      if (tenant && !tenant.isSuper && tenant.tenantId) {
        userQuery = userQuery.eq('tenant_id', tenant.tenantId);
      }
      await userQuery;
    }

    if (cleanEmail && targetRole) {
      try {
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const authUser = authUsers?.users?.find(u => u.email?.toLowerCase().trim() === cleanEmail);
        if (authUser?.id) {
          await supabase.auth.admin.updateUserById(authUser.id, {
            user_metadata: { ...authUser.user_metadata, role: targetRole }
          });
        }
      } catch (e) {}
    }

    return NextResponse.json({ success: true, email: cleanEmail, role: targetRole });
  } catch (error: any) {
    console.error('[ACCESOS_PATCH_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const tenant = await resolveTenantFromRequest(request);
    const { email, id } = await request.json();

    let cleanEmail = email ? email.toLowerCase().trim() : null;

    if (id) {
      let q = supabase.from('authorized_users').delete().eq('id', id);
      if (tenant && !tenant.isSuper && tenant.tenantId) {
        q = q.eq('tenant_id', tenant.tenantId);
      }
      await q;
    }
    if (cleanEmail) {
      let q1 = supabase.from('authorized_users').delete().ilike('email', cleanEmail);
      let q2 = supabase.from('resources').delete().ilike('email', cleanEmail);
      let q3 = supabase.from('users').delete().ilike('email', cleanEmail);

      if (tenant && !tenant.isSuper && tenant.tenantId) {
        q1 = q1.eq('tenant_id', tenant.tenantId);
        q2 = q2.eq('tenant_id', tenant.tenantId);
        q3 = q3.eq('tenant_id', tenant.tenantId);
      }

      await Promise.all([q1, q2, q3]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[ACCESOS_DELETE_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

