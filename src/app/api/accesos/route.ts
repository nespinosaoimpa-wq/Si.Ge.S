import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServiceClient();

    const [authRes, resRes] = await Promise.all([
      supabase.from('authorized_users').select('*').order('created_at', { ascending: false }),
      supabase.from('resources').select('id, name, email, role, status, created_at').order('created_at', { ascending: false })
    ]);

    const emailMap = new Map<string, any>();

    // 1. Add records from authorized_users
    (authRes.data || []).forEach((u: any) => {
      if (u.email) {
        const em = u.email.toLowerCase().trim();
        emailMap.set(em, {
          id: u.id,
          email: u.email,
          name: u.email.split('@')[0],
          role: u.role || 'operador',
          status: u.status || 'approved',
          source: 'authorized_users',
          created_at: u.created_at || new Date().toISOString()
        });
      }
    });

    // 2. Add records from resources if not already present
    (resRes.data || []).forEach((r: any) => {
      if (r.email) {
        const em = r.email.toLowerCase().trim();
        if (!emailMap.has(em)) {
          emailMap.set(em, {
            id: r.id,
            email: r.email,
            name: r.name || r.email.split('@')[0],
            role: r.role === 'Gerente' ? 'gerente' : 'operador',
            status: r.status === 'inactive' ? 'revoked' : 'approved',
            source: 'resources',
            created_at: r.created_at || new Date().toISOString()
          });
        } else {
          // Enrich with name if available
          const existing = emailMap.get(em);
          if (r.name) existing.name = r.name;
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
    const targetRole = role || 'operador';

    // 1. Upsert into authorized_users
    const { data: authData, error: authErr } = await supabase
      .from('authorized_users')
      .upsert({
        email: cleanEmail,
        role: targetRole,
        status: 'approved',
        approved_at: new Date().toISOString()
      }, { onConflict: 'email' })
      .select()
      .single();

    if (authErr) {
      console.error('[ACCESOS_POST_AUTH_ERR]', authErr);
    }

    // 2. Update/Upsert resources table
    await supabase
      .from('resources')
      .update({
        role: targetRole === 'gerente' ? 'Gerente' : 'vigilador',
        status: 'active'
      })
      .ilike('email', cleanEmail);

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

    const cleanEmail = email ? email.toLowerCase().trim() : null;

    // Update authorized_users
    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'approved') updateData.approved_at = new Date().toISOString();
    }

    if (id) {
      await supabase.from('authorized_users').update(updateData).eq('id', id);
    }
    if (cleanEmail) {
      await supabase.from('authorized_users').update(updateData).ilike('email', cleanEmail);
    }

    // Update resources table
    if (cleanEmail) {
      const resUpdate: any = {};
      if (role !== undefined) resUpdate.role = role === 'gerente' ? 'Gerente' : 'vigilador';
      if (status !== undefined) resUpdate.status = status === 'approved' ? 'active' : 'inactive';
      await supabase.from('resources').update(resUpdate).ilike('email', cleanEmail);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[ACCESOS_PATCH_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createServiceClient();
    const { email, id } = await request.json();

    if (id) {
      await supabase.from('authorized_users').delete().eq('id', id);
    }
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      await supabase.from('authorized_users').delete().ilike('email', cleanEmail);
      await supabase.from('resources').delete().ilike('email', cleanEmail);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[ACCESOS_DELETE_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
