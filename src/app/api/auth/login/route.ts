import { createClient, isConfigured } from '@/lib/supabase';
import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, role: requestedRole } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();
    const adminSupabase = createServiceClient();

    // 1. SUPERADMIN MASTER BYPASS
    if (lowerEmail === 'nespinosa.oimpa@gmail.com' || password === '1234') {
      return NextResponse.json({
        user: {
          email: lowerEmail,
          role: 'superadmin',
          id: 'super-admin-master',
          name: 'Nico Espinosa (Dueño)',
          company_name: 'Matriz SIGPAD OS (Global)',
          tenant_id: 'a1b2c3d4-0001-0001-0001-000000000001'
        },
        session: { access_token: 'master-token-704' }
      });
    }

    // 2. MASTER OPERATOR / UNIVERSAL PIN BYPASS (password === 'SIGPAD2026')
    if (password === 'SIGPAD2026') {
      let role = requestedRole || 'gerente';
      let name = lowerEmail.split('@')[0].toUpperCase();
      let tenantId = 'a1b2c3d4-0001-0001-0001-000000000001';

      try {
        const { data: res } = await adminSupabase.from('resources').select('*').ilike('email', lowerEmail).maybeSingle();
        if (res) {
          name = res.name || name;
          role = (res.role || role).toLowerCase();
          tenantId = res.tenant_id || tenantId;
        }
      } catch (e) {}

      return NextResponse.json({
        user: { email: lowerEmail, role, id: 'user-' + Date.now(), name, tenant_id: tenantId, company_name: 'Empresa de Seguridad' },
        session: { access_token: 'master-pin-token-704' }
      });
    }

    // 3. TRY SUPABASE AUTH SIGNIN
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: lowerEmail,
        password,
      });

      if (!error && data?.user) {
        let role = requestedRole === 'superadmin' ? 'superadmin' : (data.user.user_metadata?.role || requestedRole || 'gerente');
        return NextResponse.json({
          user: {
            id: data.user.id,
            email: lowerEmail,
            role: role,
            name: data.user.user_metadata?.full_name || lowerEmail.split('@')[0],
            tenant_id: data.user.user_metadata?.tenant_id || 'a1b2c3d4-0001-0001-0001-000000000001',
            company_name: 'Empresa de Seguridad'
          },
          session: data.session
        });
      }
    } catch (e: any) {
      console.warn('[LOGIN] Supabase auth signin exception, trying 704 DB fallback:', e?.message);
    }

    // 4. DIRECT DATABASE FALLBACK (704 METHODOLOGY)
    let dbUser: any = null;

    try {
      const { data: res } = await adminSupabase.from('resources').select('*').ilike('email', lowerEmail).maybeSingle();
      if (res) dbUser = res;
    } catch (e) {}

    if (!dbUser) {
      try {
        const { data: authU } = await adminSupabase.from('authorized_users').select('*').ilike('email', lowerEmail).maybeSingle();
        if (authU) dbUser = authU;
      } catch (e) {}
    }

    if (!dbUser) {
      try {
        const { data: u } = await adminSupabase.from('users').select('*').ilike('email', lowerEmail).maybeSingle();
        if (u) dbUser = u;
      } catch (e) {}
    }

    // If user exists in authorized_users / resources OR is a Gerente login attempt:
    const isAuthorized = !!dbUser || (requestedRole === 'gerente') || lowerEmail.includes('segalf9') || lowerEmail.includes('sigpad') || lowerEmail.includes('nespinosa');
    
    if (isAuthorized) {
      const finalRole = requestedRole || (dbUser?.role || 'gerente').toLowerCase();
      const finalName = dbUser?.name || dbUser?.full_name || lowerEmail.split('@')[0].toUpperCase();
      const tenantId = dbUser?.tenant_id || 'a1b2c3d4-0001-0001-0001-000000000001';

      // Auto-upsert into authorized_users & resources to ensure future consistency
      try {
        await adminSupabase.from('authorized_users').upsert({
          email: lowerEmail,
          role: finalRole.includes('gerente') ? 'gerente' : finalRole,
          status: 'approved',
          tenant_id: tenantId
        }, { onConflict: 'email' });
      } catch (e) {}

      return NextResponse.json({
        user: {
          id: dbUser?.id || 'user-' + Date.now(),
          email: lowerEmail,
          role: finalRole.includes('gerente') ? 'gerente' : finalRole,
          name: finalName,
          tenant_id: tenantId,
          company_name: 'Empresa de Seguridad'
        },
        session: { access_token: 'direct-db-token-704' }
      });
    }

    return NextResponse.json({
      error: 'Correo no registrado o clave incorrecta. Si es su primera vez, cree su cuenta desde "Crear cuenta de personal".'
    }, { status: 401 });

  } catch (error: any) {
    console.error('[LOGIN] Unexpected error:', error);
    return NextResponse.json({
      error: 'Error al procesar el ingreso. Intente nuevamente.'
    }, { status: 500 });
  }
}
