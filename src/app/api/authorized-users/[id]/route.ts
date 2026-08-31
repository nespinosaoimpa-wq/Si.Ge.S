import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { removeFromMemoryWhitelist } from '@/lib/memory-whitelist';
import { resolveTenantFromRequest } from '@/lib/resolve-tenant';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveTenantFromRequest(req);
    if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { tenantId, isSuper } = ctx;

    const { id } = await params;
    const body = await req.json();
    const supabase = createServiceClient();

    let query = supabase
      .from('authorized_users')
      .update(body)
      .eq('id', id);

    if (!isSuper && tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { error } = await query;
    if (error) throw error;

    // Cascade role update to resources
    if (body.role) {
      const { data: authUser } = await supabase
        .from('authorized_users')
        .select('email')
        .eq('id', id)
        .maybeSingle();
      if (authUser?.email) {
        await supabase
          .from('resources')
          .update({ role: body.role === 'gerente' ? 'Gerente' : 'Operador' })
          .ilike('email', authUser.email);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error updating authorized user:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveTenantFromRequest(req);
    if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { tenantId, isSuper } = ctx;

    const { id } = await params;
    const supabase = createServiceClient();

    // Get email before delete for cascade & memory whitelist removal
    const { data: authUser } = await supabase
      .from('authorized_users')
      .select('email')
      .eq('id', id)
      .maybeSingle();

    const emailCandidate = authUser?.email || id.replace(/^auth-/, '');
    if (emailCandidate.includes('@')) {
      removeFromMemoryWhitelist(emailCandidate);
    }

    let query = supabase.from('authorized_users').delete().eq('id', id);
    if (!isSuper && tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    const { error } = await query;
    if (error) throw error;

    // Cascade delete from resources
    if (authUser?.email) {
      let resQuery = supabase.from('resources').delete().ilike('email', authUser.email);
      if (!isSuper && tenantId) {
        resQuery = resQuery.eq('tenant_id', tenantId);
      }
      await resQuery;
    } else if (emailCandidate.includes('@')) {
      let resQuery = supabase.from('resources').delete().ilike('email', emailCandidate);
      if (!isSuper && tenantId) {
        resQuery = resQuery.eq('tenant_id', tenantId);
      }
      await resQuery;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting authorized user:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
