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

    if (!isSuper && !tenantId) {
      return NextResponse.json({ error: 'Falta empresa asignada' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    const supabase = createServiceClient();
    
    let query = supabase
      .from('authorized_users')
      .update({ 
        status, 
        approved_at: status === 'approved' ? new Date().toISOString() : null 
      })
      .eq('id', id);

    if (!isSuper && tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.select().single();
    if (error) throw error;

    return NextResponse.json(data);
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

    if (!isSuper && !tenantId) {
      return NextResponse.json({ error: 'Falta empresa asignada' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createServiceClient();
    
    // First, try deleting from authorized_users by ID
    let authDelete = supabase.from('authorized_users').delete().eq('id', id);
    if (!isSuper && tenantId) authDelete = authDelete.eq('tenant_id', tenantId);
    await authDelete;

    // If ID contains email or prefix, try deleting by email
    const emailCandidate = id.replace(/^auth-/, '');
    if (emailCandidate.includes('@')) {
      removeFromMemoryWhitelist(emailCandidate);
      let authDelEmail = supabase.from('authorized_users').delete().ilike('email', emailCandidate);
      let resDelEmail = supabase.from('resources').delete().ilike('email', emailCandidate);
      if (!isSuper && tenantId) {
        authDelEmail = authDelEmail.eq('tenant_id', tenantId);
        resDelEmail = resDelEmail.eq('tenant_id', tenantId);
      }
      await authDelEmail;
      await resDelEmail;
    } else {
      // Also delete from resources by ID
      let resDelete = supabase.from('resources').delete().eq('id', id);
      if (!isSuper && tenantId) resDelete = resDelete.eq('tenant_id', tenantId);
      await resDelete;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting authorized user:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

