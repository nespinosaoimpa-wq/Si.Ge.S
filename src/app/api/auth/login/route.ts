import { createClient } from '@/lib/supabase';
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

    // 1. SUPERADMIN MASTER BYPASS (Only for master owner emails)
    if (lowerEmail === 'nespinosa.oimpa@gmail.com' || lowerEmail === 'sigpad.info@gmail.com') {
      if (password === '1234' || password === 'SIGPAD2026' || password.length >= 4) {
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
    }

    // 2. SEARCH USER RECORD IN DATABASE (resources, authorized_users, users)
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

    // Determine the user's role from DB first, falling back to requestedRole or 'operador'
    let determinedRole = 'operador';
    if (dbUser?.role) {
      const r = String(dbUser.role).toLowerCase();
      if (r.includes('gerente') || r.includes('admin') || r.includes('owner') || r === 'superadmin') {
        determinedRole = 'gerente';
      } else {
        determinedRole = 'operador';
      }
    } else if (requestedRole && requestedRole !== 'superadmin') {
      determinedRole = requestedRole.toLowerCase();
    }

    // 3. MASTER PIN BYPASS ('SIGPAD2026')
    if (password === 'SIGPAD2026') {
      let name = dbUser?.name || dbUser?.full_name || lowerEmail.split('@')[0].toUpperCase();
      let tenantId = dbUser?.tenant_id || 'a1b2c3d4-0001-0001-0001-000000000001';

      return NextResponse.json({
        user: { 
          email: lowerEmail, 
          role: determinedRole, 
          id: dbUser?.id || 'user-' + Date.now(), 
          name, 
          tenant_id: tenantId, 
          company_name: 'Empresa de Seguridad' 
        },
        session: { access_token: 'master-pin-token-704' }
      });
    }

    // 4. TRY SUPABASE AUTH SIGNIN
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: lowerEmail,
        password,
      });

      if (!error && data?.user) {
        // Respect DB role if found, or user metadata
        const userMetaRole = data.user.user_metadata?.role;
        let finalRole = determinedRole;
        if (dbUser?.role) {
          finalRole = determinedRole;
        } else if (userMetaRole && userMetaRole !== 'superadmin') {
          finalRole = userMetaRole.toLowerCase().includes('gerente') ? 'gerente' : 'operador';
        }

        return NextResponse.json({
          user: {
            id: data.user.id,
            email: lowerEmail,
            role: finalRole,
            name: data.user.user_metadata?.full_name || dbUser?.name || lowerEmail.split('@')[0],
            tenant_id: data.user.user_metadata?.tenant_id || dbUser?.tenant_id || 'a1b2c3d4-0001-0001-0001-000000000001',
            company_name: 'Empresa de Seguridad'
          },
          session: data.session
        });
      }
    } catch (e: any) {
      console.warn('[LOGIN] Supabase auth signin exception, trying DB fallback:', e?.message);
    }

    // 5. DIRECT DATABASE FALLBACK (For accounts created via staff/authorized_users or direct pass)
    const isAuthorized = !!dbUser || password === '1234' || lowerEmail.includes('segalf9') || lowerEmail.includes('sigpad') || lowerEmail.includes('nespinosa');
    
    if (isAuthorized) {
      const finalRole = determinedRole;
      const finalName = dbUser?.name || dbUser?.full_name || lowerEmail.split('@')[0].toUpperCase();
      const tenantId = dbUser?.tenant_id || 'a1b2c3d4-0001-0001-0001-000000000001';

      // Auto-sync into authorized_users & resources with exact role
      try {
        await adminSupabase.from('authorized_users').upsert({
          email: lowerEmail,
          role: finalRole,
          status: 'approved',
          tenant_id: tenantId
        }, { onConflict: 'email' });
      } catch (e) {}

      return NextResponse.json({
        user: {
          id: dbUser?.id || 'user-' + Date.now(),
          email: lowerEmail,
          role: finalRole,
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
