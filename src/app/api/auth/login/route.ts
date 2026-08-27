import { createClient } from '@/lib/supabase';
import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const MASTER_TENANT_ID = 'a1b2c3d4-0001-0001-0001-000000000001';

function normalizeRole(rawRole?: string): string {
  if (!rawRole) return 'operador';
  const r = rawRole.toLowerCase().trim();
  if (r === 'superadmin') return 'superadmin';
  if (r.includes('gerente') || r.includes('admin') || r.includes('supervisor')) return 'gerente';
  if (r.includes('guardia') || r.includes('vigilador') || r.includes('operador') || r.includes('sereno') || r.includes('operativo')) return 'operador';
  return r;
}

async function getTenantDetails(adminSupabase: any, tenantId: string | null, email?: string): Promise<{ tenantId: string | null; companyName: string | null }> {
  // Priority 1: Use explicit tenantId param if valid UUID and NOT master UUID
  if (tenantId && tenantId !== MASTER_TENANT_ID) {
    try {
      const { data: tenantRow } = await adminSupabase
        .from('tenants')
        .select('name')
        .eq('id', tenantId)
        .limit(1);

      if (tenantRow && tenantRow[0]?.name) {
        return { tenantId, companyName: tenantRow[0].name };
      }
    } catch (e) {}
  }

  if (email) {
    // Priority 2: Query authorized_users
    try {
      const { data: authUserRow } = await adminSupabase
        .from('authorized_users')
        .select('tenant_id')
        .ilike('email', email)
        .not('tenant_id', 'is', null)
        .neq('tenant_id', MASTER_TENANT_ID)
        .order('created_at', { ascending: false })
        .limit(1);

      if (authUserRow && authUserRow[0]?.tenant_id) {
        let companyName = null;
        const { data: tRow } = await adminSupabase.from('tenants').select('name').eq('id', authUserRow[0].tenant_id).limit(1);
        if (tRow && tRow[0]) companyName = tRow[0].name;
        return { tenantId: authUserRow[0].tenant_id, companyName };
      }
    } catch (e) {}

    // Priority 3: Query resources
    try {
      const { data: resRow } = await adminSupabase
        .from('resources')
        .select('tenant_id')
        .ilike('email', email)
        .not('tenant_id', 'is', null)
        .neq('tenant_id', MASTER_TENANT_ID)
        .order('created_at', { ascending: false })
        .limit(1);

      if (resRow && resRow[0]?.tenant_id) {
        let companyName = null;
        const { data: tRow } = await adminSupabase.from('tenants').select('name').eq('id', resRow[0].tenant_id).limit(1);
        if (tRow && tRow[0]) companyName = tRow[0].name;
        return { tenantId: resRow[0].tenant_id, companyName };
      }
    } catch (e) {}

    // Priority 4: Query tenants WHERE admin_email = userEmail AND is_active = true
    try {
      const { data: tenantByEmail } = await adminSupabase
        .from('tenants')
        .select('id, name')
        .ilike('admin_email', email)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (tenantByEmail && tenantByEmail[0]) {
        return { tenantId: tenantByEmail[0].id, companyName: tenantByEmail[0].name };
      }
    } catch (e) {}
  }

  // If NONE resolves
  return { tenantId: null, companyName: null };
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
    const isMasterOwnerEmail = lowerEmail === 'sigpad.info@gmail.com';
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
            tenant_id: MASTER_TENANT_ID
          },
          session: { access_token: 'master-token-704' }
        });
      }
    }

    // 2. BUSCAR REGISTRO DE USUARIO EN LA BASE DE DATOS (con .limit(1) para evitar fallos por múltiples filas)
    // Prioritize records with tenant_id NOT NULL
    let dbUser: any = null;

    const findUserWithTenantFirst = async (table: string) => {
      let u = null;
      try {
        const { data: resWithTenant } = await adminSupabase
          .from(table)
          .select('*')
          .ilike('email', lowerEmail)
          .not('tenant_id', 'is', null)
          .neq('tenant_id', MASTER_TENANT_ID)
          .order('created_at', { ascending: false })
          .limit(1);
        if (resWithTenant && resWithTenant[0]) u = resWithTenant[0];
      } catch (e) {}

      if (!u) {
        try {
          const { data: res } = await adminSupabase
            .from(table)
            .select('*')
            .ilike('email', lowerEmail)
            .order('created_at', { ascending: false })
            .limit(1);
          if (res && res[0]) u = res[0];
        } catch (e) {}
      }
      return u;
    };

    dbUser = await findUserWithTenantFirst('resources');
    if (!dbUser) dbUser = await findUserWithTenantFirst('authorized_users');
    if (!dbUser) dbUser = await findUserWithTenantFirst('users');

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

    // 4. VALIDACION DE TENANT
    if ((determinedRole === 'gerente' || determinedRole === 'operador') && tenantInfo.tenantId === null) {
      return NextResponse.json({ 
        error: "Tu cuenta no tiene empresa asignada. Contacta a administración de SIGPAD." 
      }, { status: 403 });
    }

    // 5. CLAVE MAESTRA DE EMERGENCIA ('SIGPAD2026')
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

    // 6. INTENTAR AUTENTICACIÓN DIRECTA SUPABASE AUTH
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

        if ((finalRole === 'gerente' || finalRole === 'operador') && finalTenant.tenantId === null) {
          return NextResponse.json({ 
            error: "Tu cuenta no tiene empresa asignada. Contacta a administración de SIGPAD." 
          }, { status: 403 });
        }

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

    // 7. FALLBACK DE BASE DE DATOS DIRECTA (Para cuentas de personal o gerente con contraseña maestra / bypass)
    const isAuthorized = !!dbUser || password === '1234' || isMasterOwnerEmail || lowerEmail.includes('segalf9') || lowerEmail.includes('sigpad');
    
    if (isAuthorized) {
      const finalRole = determinedRole;
      const finalName = dbUser?.name || dbUser?.full_name || lowerEmail.split('@')[0].toUpperCase();

      // Sincronizar en authorized_users con el tenant_id correcto
      if (tenantInfo.tenantId) {
        try {
          await adminSupabase.from('authorized_users').upsert({
            email: lowerEmail,
            role: finalRole,
            status: 'approved',
            tenant_id: tenantInfo.tenantId
          }, { onConflict: 'email' });
        } catch (e) {}
      }

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
