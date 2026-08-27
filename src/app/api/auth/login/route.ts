import { createClient } from '@/lib/supabase';
import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

function normalizeRole(rawRole?: string): string {
  if (!rawRole) return 'operador';
  const r = rawRole.toLowerCase().trim();
  if (r === 'superadmin') return 'superadmin';
  if (r.includes('gerente') || r.includes('admin') || r.includes('supervisor')) return 'gerente';
  if (r.includes('guardia') || r.includes('vigilador') || r.includes('operador') || r.includes('sereno') || r.includes('operativo')) return 'operador';
  return r;
}

async function getTenantDetails(adminSupabase: any, tenantId: string | null, email?: string): Promise<{ tenantId: string; companyName: string }> {
  let finalTenantId = tenantId || 'a1b2c3d4-0001-0001-0001-000000000001';
  let companyName = 'Empresa de Seguridad';

  // Si no se proporcionó tenantId explícito pero hay email, buscar el último tenant creado por este mail
  if ((!tenantId || tenantId === 'a1b2c3d4-0001-0001-0001-000000000001') && email) {
    try {
      const { data: tenantByEmail } = await adminSupabase
        .from('tenants')
        .select('id, name')
        .ilike('admin_email', email)
        .order('created_at', { ascending: false })
        .limit(1);

      if (tenantByEmail && tenantByEmail[0]) {
        finalTenantId = tenantByEmail[0].id;
        companyName = tenantByEmail[0].name;
        return { tenantId: finalTenantId, companyName };
      }
    } catch (e) {}
  }

  // Buscar por tenantId
  if (finalTenantId) {
    try {
      const { data: tenantRow } = await adminSupabase
        .from('tenants')
        .select('name')
        .eq('id', finalTenantId)
        .limit(1);

      if (tenantRow && tenantRow[0]?.name) {
        companyName = tenantRow[0].name;
      }
    } catch (e) {}
  }

  return { tenantId: finalTenantId, companyName };
}

export async function POST(request: Request) {
  try {
    const { email, password, role: requestedRole } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();
    const adminSupabase = createServiceClient();

    // 1. SUPERADMIN MASTER BYPASS (Solo si el usuario seleccionó o requirió explícitamente SuperAdmin)
    const isMasterOwnerEmail = lowerEmail === 'nespinosa.oimpa@gmail.com' || lowerEmail === 'sigpad.info@gmail.com';
    const isSuperAdminRequested = requestedRole === 'superadmin';

    if (isMasterOwnerEmail && isSuperAdminRequested) {
      if (password === '1234' || password === 'SIGPAD2026' || password.length >= 4) {
        return NextResponse.json({
          user: {
            email: lowerEmail,
            role: 'superadmin',
            id: 'super-admin-master',
            name: 'SIGPAD SuperAdmin',
            company_name: 'Matriz SIGPAD OS (Global)',
            tenant_id: 'a1b2c3d4-0001-0001-0001-000000000001'
          },
          session: { access_token: 'master-token-704' }
        });
      }
    }

    // 2. BUSCAR REGISTRO DE USUARIO EN LA BASE DE DATOS (con .limit(1) para evitar fallos por múltiples filas)
    let dbUser: any = null;

    try {
      const { data: res } = await adminSupabase.from('resources').select('*').ilike('email', lowerEmail).order('created_at', { ascending: false }).limit(1);
      if (res && res[0]) dbUser = res[0];
    } catch (e) {}

    if (!dbUser) {
      try {
        const { data: authU } = await adminSupabase.from('authorized_users').select('*').ilike('email', lowerEmail).order('created_at', { ascending: false }).limit(1);
        if (authU && authU[0]) dbUser = authU[0];
      } catch (e) {}
    }

    if (!dbUser) {
      try {
        const { data: u } = await adminSupabase.from('users').select('*').ilike('email', lowerEmail).order('created_at', { ascending: false }).limit(1);
        if (u && u[0]) dbUser = u[0];
      } catch (e) {}
    }

    // 3. BUSCAR SI ESTE MAIL REGISTRÓ UNA EMPRESA EN LA TABLA TENANTS
    let tenantInfo = await getTenantDetails(adminSupabase, dbUser?.tenant_id || null, lowerEmail);

    // Determinar rol final
    let determinedRole = 'operador';
    if (requestedRole === 'gerente') {
      determinedRole = 'gerente';
    } else if (requestedRole === 'superadmin' && isMasterOwnerEmail) {
      determinedRole = 'superadmin';
    } else if (dbUser?.role) {
      const r = String(dbUser.role).toLowerCase();
      if (r.includes('gerente') || r.includes('admin') || r.includes('owner') || r === 'superadmin') {
        determinedRole = 'gerente';
      } else {
        determinedRole = 'operador';
      }
    } else if (requestedRole) {
      determinedRole = requestedRole.toLowerCase();
    }

    // 4. CLAVE MAESTRA DE EMERGENCIA ('SIGPAD2026')
    if (password === 'SIGPAD2026') {
      let name = dbUser?.name || dbUser?.full_name || lowerEmail.split('@')[0].toUpperCase();

      return NextResponse.json({
        user: { 
          email: lowerEmail, 
          role: determinedRole, 
          id: dbUser?.id || 'user-' + Date.now(), 
          name, 
          tenant_id: tenantInfo.tenantId, 
          company_name: tenantInfo.companyName 
        },
        session: { access_token: 'master-pin-token-704' }
      });
    }

    // 5. INTENTAR AUTENTICACIÓN DIRECTA SUPABASE AUTH
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: lowerEmail,
        password,
      });

      if (!error && data?.user) {
        const userMetaRole = data.user.user_metadata?.role;
        let finalRole = determinedRole;
        if (dbUser?.role) {
          finalRole = determinedRole;
        } else if (userMetaRole && userMetaRole !== 'superadmin') {
          finalRole = userMetaRole.toLowerCase().includes('gerente') ? 'gerente' : 'operador';
        }

        const effectiveTenantId = data.user.user_metadata?.tenant_id || dbUser?.tenant_id || tenantInfo.tenantId;
        const finalTenant = await getTenantDetails(adminSupabase, effectiveTenantId, lowerEmail);

        return NextResponse.json({
          user: {
            id: data.user.id,
            email: lowerEmail,
            role: finalRole,
            name: data.user.user_metadata?.full_name || dbUser?.name || lowerEmail.split('@')[0],
            tenant_id: finalTenant.tenantId,
            company_name: finalTenant.companyName
          },
          session: data.session
        });
      }
    } catch (e: any) {
      console.warn('[LOGIN] Supabase auth signin exception, intentando fallback de base de datos:', e?.message);
    }

    // 6. FALLBACK DE BASE DE DATOS DIRECTA (Para cuentas de personal o gerente con contraseña maestra / bypass)
    const isAuthorized = !!dbUser || password === '1234' || isMasterOwnerEmail || lowerEmail.includes('segalf9') || lowerEmail.includes('sigpad');
    
    if (isAuthorized) {
      const finalRole = determinedRole;
      const finalName = dbUser?.name || dbUser?.full_name || lowerEmail.split('@')[0].toUpperCase();

      // Sincronizar en authorized_users con el tenant_id correcto
      try {
        await adminSupabase.from('authorized_users').upsert({
          email: lowerEmail,
          role: finalRole,
          status: 'approved',
          tenant_id: tenantInfo.tenantId
        }, { onConflict: 'email' });
      } catch (e) {}

      return NextResponse.json({
        user: {
          id: dbUser?.id || 'user-' + Date.now(),
          email: lowerEmail,
          role: finalRole,
          name: finalName,
          tenant_id: tenantInfo.tenantId,
          company_name: tenantInfo.companyName
        },
        session: { access_token: 'direct-db-token-704' }
      });
    }

    return NextResponse.json({
      error: 'Correo no registrado o clave incorrecta. Si es su primera vez, cree su cuenta desde "Crear cuenta de personal".'
    }, { status: 401 });

  } catch (error: any) {
    console.error('[LOGIN] Error inesperado:', error);
    return NextResponse.json({
      error: 'Error al procesar el ingreso. Intente nuevamente.'
    }, { status: 500 });
  }
}
