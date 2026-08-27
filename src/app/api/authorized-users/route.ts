import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { inMemoryAuthorizedUsers } from '@/lib/memory-whitelist';
import { resolveTenantFromRequest } from '@/lib/resolve-tenant';

export async function GET(req: NextRequest) {
  try {
    const ctx = await resolveTenantFromRequest(req);
    if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { tenantId, isSuper } = ctx;

    if (!isSuper && !tenantId) {
      return NextResponse.json([]);
    }

    const supabase = createServiceClient();
    
    // 1. Fetch authorized_users from Supabase filtered by tenant_id
    let authUsers: any[] = [];
    try {
      let query = supabase
        .from('authorized_users')
        .select('*')
        .order('created_at', { ascending: false });
      if (!isSuper && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;
      if (!error && data) authUsers = data;
    } catch (e: any) {
      console.warn('[GET_AUTHORIZED_USERS] authorized_users query notice:', e?.message);
    }

    // 2. Fetch resources from Supabase filtered by tenant_id
    let resources: any[] = [];
    try {
      let query = supabase
        .from('resources')
        .select('id, name, email, role, status, created_at, tenant_id')
        .neq('status', 'baja')
        .order('created_at', { ascending: false });
      if (!isSuper && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;
      if (!error && data) resources = data;
    } catch (e: any) {
      console.warn('[GET_AUTHORIZED_USERS] resources query notice:', e?.message);
    }

    const map = new Map<string, any>();

    // Include in-memory authorized users strictly matching tenant_id
    inMemoryAuthorizedUsers.forEach((u, key) => {
      if (isSuper || (tenantId && u.tenant_id === tenantId)) {
        map.set(key, u);
      }
    });

    if (Array.isArray(authUsers)) {
      authUsers.forEach(u => {
        if (u.email) {
          const emailClean = u.email.toLowerCase().trim();
          if (!map.has(emailClean)) {
            map.set(emailClean, {
              id: u.id || 'auth-' + emailClean,
              email: emailClean,
              role: (u.role || 'operador').toLowerCase(),
              status: u.status || 'approved',
              created_at: u.created_at || u.approved_at || new Date().toISOString(),
              tenant_id: u.tenant_id
            });
          }
        }
      });
    }

    if (Array.isArray(resources)) {
      resources.forEach(r => {
        if (r.email) {
          const emailClean = r.email.toLowerCase().trim();
          const existing = map.get(emailClean);
          if (!existing) {
            map.set(emailClean, {
              id: r.id,
              email: emailClean,
              name: r.name,
              role: (r.role || 'operador').toLowerCase(),
              status: r.status === 'active' ? 'approved' : (r.status || 'approved'),
              created_at: r.created_at || new Date().toISOString(),
              tenant_id: r.tenant_id
            });
          }
        }
      });
    }

    const result = Array.from(map.values()).sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error fetching authorized users:', err);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveTenantFromRequest(req);
    if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { tenantId, isSuper } = ctx;

    const body = await req.json();
    const { email, role, status } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email es requerido' }, { status: 400 });
    }

    const targetTenantId = isSuper ? (body.tenant_id || tenantId) : tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'No se puede autorizar: falta empresa asignada' }, { status: 400 });
    }
    const emailNormalized = email.toLowerCase().trim();
    const displayRole = (role || 'operador').toLowerCase();
    const createdItem = {
      id: `auth-${Date.now()}`,
      email: emailNormalized,
      role: displayRole,
      status: status || 'approved',
      approved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      tenant_id: targetTenantId
    };

    // 1. Cache in server memory immediately
    inMemoryAuthorizedUsers.set(emailNormalized, createdItem);

    // 2. Persist in Supabase Postgres DB
    try {
      const supabase = createServiceClient();

      // Upsert to authorized_users with tenant_id
      await supabase.from('authorized_users').upsert({
        email: emailNormalized,
        role: displayRole,
        status: status || 'approved',
        tenant_id: targetTenantId,
        approved_at: new Date().toISOString()
      }, { onConflict: 'email' });

      // Upsert to resources with tenant_id
      const { data: resExisting } = await supabase.from('resources').select('id').ilike('email', emailNormalized).maybeSingle();
      if (resExisting) {
        await supabase.from('resources').update({
          role: displayRole === 'gerente' ? 'Gerente' : 'Operador',
          status: 'active',
          tenant_id: targetTenantId
        }).eq('id', resExisting.id);
      } else {
        await supabase.from('resources').insert({
          name: emailNormalized.split('@')[0].toUpperCase(),
          email: emailNormalized,
          role: displayRole === 'gerente' ? 'Gerente' : 'Operador',
          status: 'active',
          tenant_id: targetTenantId
        });
      }
    } catch (dbErr: any) {
      console.warn('[POST_AUTHORIZED_USER] Supabase DB notice:', dbErr?.message);
    }

    return NextResponse.json(createdItem);
  } catch (err: any) {
    console.error('Error creating authorized user:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
