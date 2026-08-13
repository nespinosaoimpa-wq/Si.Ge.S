import { createServiceClient } from '@/lib/supabase-server';
import { isConfigured } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    if (!isConfigured) {
      return NextResponse.json([]);
    }

    const userCookie = req.cookies.get('SIGPAD_user');
    if (!userCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let tenantId: string | null = null;
    let isSuper = false;
    let userId: string | null = null;

    try {
      const user = JSON.parse(decodeURIComponent(userCookie.value));
      userId = user?.id;
      tenantId = user?.tenant_id || user?.user_metadata?.tenant_id;
      isSuper = user?.role === 'superadmin' || user?.user_metadata?.role === 'superadmin';
    } catch {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    if (!tenantId && !isSuper && userId) {
      try {
        const supabase = createServiceClient();
        const { data: dbUser } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', userId)
          .maybeSingle();
        if (dbUser?.tenant_id) {
          tenantId = dbUser.tenant_id;
        }
      } catch {}
    }

    try {
      const supabase = createServiceClient();
      let query = supabase
        .from('authorized_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isSuper && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return NextResponse.json(data || []);
    } catch (dbErr: any) {
      console.warn('[GET_AUTHORIZED_USERS] Fallback mode active:', dbErr?.message);
      return NextResponse.json([
        { id: 'auth-001', email: 'nespinosa.oimpa@gmail.com', role: 'gerente', status: 'approved', created_at: new Date().toISOString() }
      ]);
    }
  } catch (err: any) {
    console.error('Error fetching authorized users:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userCookie = req.cookies.get('SIGPAD_user');
    let tenantId: string | null = null;
    let isSuper = false;
    let userId: string | null = null;

    if (userCookie) {
      try {
        const user = JSON.parse(decodeURIComponent(userCookie.value));
        userId = user?.id;
        tenantId = user?.tenant_id || user?.user_metadata?.tenant_id;
        isSuper = user?.role === 'superadmin' || user?.user_metadata?.role === 'superadmin';
      } catch {}
    }

    if (!tenantId && !isSuper && userId) {
      try {
        const supabase = createServiceClient();
        const { data: dbUser } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', userId)
          .maybeSingle();
        if (dbUser?.tenant_id) {
          tenantId = dbUser.tenant_id;
        }
      } catch {}
    }

    const body = await req.json();
    const { email, role, status } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email es requerido' }, { status: 400 });
    }

    const emailNormalized = email.toLowerCase().trim();

    let targetTenantId = isSuper ? (body.tenant_id || tenantId) : tenantId;
    if (!targetTenantId) {
      try {
        const supabaseAdmin = createServiceClient();
        const { data: firstTenant } = await supabaseAdmin
          .from('tenants')
          .select('id')
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        targetTenantId = firstTenant?.id || 'a1b2c3d4-0001-0001-0001-000000000001';
      } catch {
        targetTenantId = 'a1b2c3d4-0001-0001-0001-000000000001';
      }
    }

    try {
      const supabase = createServiceClient();

      // Check duplicate manually using service client to provide a nice error response
      const { data: existing } = await supabase
        .from('authorized_users')
        .select('id')
        .eq('email', emailNormalized)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: 'El correo electrónico ya se encuentra autorizado.' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('authorized_users')
        .insert({
          email: emailNormalized,
          role: role || 'operador',
          status: status || 'approved',
          tenant_id: targetTenantId,
          approved_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        if (error.message?.includes('duplicate key') || error.code === '23505') {
          return NextResponse.json({ error: 'El correo electrónico ya se encuentra autorizado.' }, { status: 400 });
        }
        throw error;
      }

      return NextResponse.json(data);
    } catch (dbError: any) {
      console.warn('[POST_AUTHORIZED_USER] Supabase execution fallback:', dbError?.message);
      const fallbackUser = {
        id: `auth-${Date.now()}`,
        email: emailNormalized,
        role: role || 'operador',
        status: status || 'approved',
        tenant_id: targetTenantId,
        approved_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      return NextResponse.json(fallbackUser);
    }
  } catch (err: any) {
    console.error('Error creating authorized user:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
