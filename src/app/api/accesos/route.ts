import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function normalizeRole(r?: string): string {
  if (!r) return 'operador';
  const lower = r.toLowerCase().trim();
  if (lower.includes('gerente') || lower.includes('admin') || lower === 'supervisor') return 'gerente';
  if (lower.includes('cliente') || lower.includes('vip')) return 'cliente';
  return 'operador';
}

export async function GET() {
  try {
    const supabase = createServiceClient();

    const [authRes, resRes, usersRes] = await Promise.all([
      supabase.from('authorized_users').select('*').order('created_at', { ascending: false }),
      supabase.from('resources').select('id, name, email, role, status, created_at').order('created_at', { ascending: false }),
      supabase.from('users').select('id, email, role').order('created_at', { ascending: false }).catch(() => ({ data: [] }))
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
            source: 'users',
            created_at: new Date().toISOString()
          });
        }
      }
    });

    const combinedUsers = Array.from(emailMap.values());
    return NextResponse.json(combinedUsers);
  } catch (error: any) {
    console.error('[ACCESOS_GET_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const { email, role } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const targetRole = normalizeRole(role);
    const dbResRole = targetRole === 'gerente' ? 'Gerente' : 'vigilador';

    // 1. Upsert into authorized_users
    const { data: authData } = await supabase
      .from('authorized_users')
      .upsert({
        email: cleanEmail,
        role: targetRole,
        status: 'approved',
        approved_at: new Date().toISOString()
      }, { onConflict: 'email' })
      .select()
      .single();

    // 2. Update resources table
    await supabase
      .from('resources')
      .update({
        role: dbResRole,
        status: 'active'
      })
      .ilike('email', cleanEmail);

    // 3. Update users table if user registered previously
    await supabase
      .from('users')
      .update({ role: targetRole })
      .ilike('email', cleanEmail);

    // 4. Update Supabase Auth user metadata
    try {
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers?.users?.find(u => u.email?.toLowerCase().trim() === cleanEmail);
      if (authUser?.id) {
        await supabase.auth.admin.updateUserById(authUser.id, {
          user_metadata: { ...authUser.user_metadata, role: targetRole }
        });
      }
    } catch (e) {}

    return NextResponse.json({ success: true, user: authData });
  } catch (error: any) {
    console.error('[ACCESOS_POST_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createServiceClient();
    const { email, id, role, status } = await request.json();

    if (!email && !id) {
      return NextResponse.json({ error: 'Email or ID is required' }, { status: 400 });
    }

    let cleanEmail = email ? email.toLowerCase().trim() : null;

    // If email is missing, resolve email from authorized_users or resources by ID
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

    // 1. Update authorized_users
    const authUpdateData: any = {};
    if (targetRole) authUpdateData.role = targetRole;
    if (status !== undefined) {
      authUpdateData.status = status;
      if (status === 'approved') authUpdateData.approved_at = new Date().toISOString();
    }

    if (id) {
      await supabase.from('authorized_users').update(authUpdateData).eq('id', id);
    }
    if (cleanEmail) {
      await supabase.from('authorized_users').update(authUpdateData).ilike('email', cleanEmail);
    }

    // 2. Update resources table
    if (cleanEmail) {
      const resUpdate: any = {};
      if (dbResRole) resUpdate.role = dbResRole;
      if (status !== undefined) resUpdate.status = status === 'approved' ? 'active' : 'inactive';
      await supabase.from('resources').update(resUpdate).ilike('email', cleanEmail);
    }

    // 3. Update public.users table
    if (cleanEmail && targetRole) {
      await supabase.from('users').update({ role: targetRole }).ilike('email', cleanEmail);
    }

    // 4. Sync Supabase Auth User metadata
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

export async function DELETE(request: Request) {
  try {
    const supabase = createServiceClient();
    const { email, id } = await request.json();

    let cleanEmail = email ? email.toLowerCase().trim() : null;

    if (id) {
      await supabase.from('authorized_users').delete().eq('id', id);
    }
    if (cleanEmail) {
      await supabase.from('authorized_users').delete().ilike('email', cleanEmail);
      await supabase.from('resources').delete().ilike('email', cleanEmail);
      await supabase.from('users').delete().ilike('email', cleanEmail);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[ACCESOS_DELETE_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
