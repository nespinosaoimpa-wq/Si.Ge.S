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

    // 1. TACTICAL MANAGER & SUPERADMIN BYPASS: Always guarantee entry for lead manager
    if (lowerEmail === 'nespinosa.oimpa@gmail.com') {
      const isPersonalPassword = password === 'Nico1905';
      const isMaster = password === 'SIGPAD2026' || password === '1234';

      if (isPersonalPassword || isMaster) {
        console.log(`[AUTH] Guaranteed manager/superadmin login for ${lowerEmail}`);
        let managerRes = null;
        if (isConfigured) {
          try {
            const { data } = await adminSupabase
              .from('resources')
              .select('id, name, tenant_id, role')
              .ilike('email', lowerEmail)
              .maybeSingle();
            managerRes = data;
          } catch {}
        }

        const assignedRole = (requestedRole === 'superadmin' || password === '1234' || managerRes?.role?.toLowerCase() === 'superadmin')
          ? 'superadmin'
          : 'gerente';
          
        return NextResponse.json({ 
          user: { 
            email: lowerEmail, 
            role: assignedRole, 
            id: managerRes?.id || 'S-701', 
            name: managerRes?.name || 'Nico Espinosa',
            tenant_id: managerRes?.tenant_id || null
          },
          session: { access_token: 'manager-tactical-token' } 
        });
      }
    }

    // 2. MASTER PIN LOGIC: Check Master PINs (1234 = SuperAdmin, SIGPAD2026 = Operator/Manager)
    const isMasterOperator = password === 'SIGPAD2026';
    const isMasterAdmin = password === '1234';

    if (isMasterAdmin) {
      console.log(`[AUTH] SuperAdmin Master PIN used for ${lowerEmail}`);
      return NextResponse.json({ 
        user: { 
          email: lowerEmail, 
          role: 'superadmin', 
          id: 'super-admin-master', 
          name: 'Super Admin Master' 
        },
        session: { access_token: 'superadmin-master-token' } 
      });
    }

    if (isMasterOperator) {
      if (isConfigured) {
        try {
          const { data: resources } = await adminSupabase
            .from('resources')
            .select('id, name, role, status, tenant_id')
            .ilike('email', lowerEmail)
            .neq('status', 'baja')
            .order('created_at', { ascending: false })
            .limit(1);
          
          const resource = resources?.[0];

          if (resource) {
            const dbRole = (resource.role || '').toLowerCase();
            const effectiveRole = requestedRole || (dbRole.includes('gerente') ? 'gerente' : 'operador');
            
            console.log(`[AUTH] Master PIN Login Success for ${lowerEmail} as ${effectiveRole}`);

            return NextResponse.json({ 
              user: { 
                email: lowerEmail, 
                role: effectiveRole, 
                id: resource.id, 
                name: resource.name,
                tenant_id: resource.tenant_id
              },
              session: { access_token: 'master-pin-token' } 
            });
          }
        } catch {}
      }

      return NextResponse.json({ 
        user: { email: lowerEmail, role: requestedRole || 'gerente', id: 'demo-user', name: 'Usuario Demo' },
        session: { access_token: 'master-pin-fallback' } 
      });
    }

    if (!isConfigured) {
      return NextResponse.json({ 
        error: '⚠️ FALTAN VARIABLES DE ENTORNO: Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Vercel.' 
      }, { status: 400 });
    }

    // 3. TRY REGULAR SUPABASE AUTH
    const supabase = createClient();
    let { data, error } = await supabase.auth.signInWithPassword({
      email: lowerEmail,
      password,
    });

    // 4. AUTO-RECOVERY IF SUPABASE WAS PAUSED/RESTORED & AUTH FAILED
    if (error) {
      console.warn(`[AUTH] Primary Supabase Auth failed for ${lowerEmail}: ${error.message}. Checking auto-recovery...`);
      
      // Check if user is whitelisted in resources or authorized_users
      const { data: resource } = await adminSupabase
        .from('resources')
        .select('id, name, role, tenant_id')
        .ilike('email', lowerEmail)
        .limit(1)
        .maybeSingle();

      const { data: authUser } = await adminSupabase
        .from('authorized_users')
        .select('id, role, status, tenant_id')
        .ilike('email', lowerEmail)
        .limit(1)
        .maybeSingle();

      if (resource || authUser) {
        const dbRole = (resource?.role || authUser?.role || 'operador').toLowerCase();
        const userRole = requestedRole || (dbRole.includes('gerente') ? 'gerente' : 'operador');
        const userName = resource?.name || 'Usuario SIGPAD';
        const tenantId = resource?.tenant_id || authUser?.tenant_id || null;

        // Auto-provision or update password in auth.users
        try {
          const { data: existingAuthUsers } = await adminSupabase.auth.admin.listUsers();
          const existingAuth = existingAuthUsers?.users?.find(u => u.email?.toLowerCase() === lowerEmail);

          if (existingAuth) {
            // Reset password and confirm email
            await adminSupabase.auth.admin.updateUserById(existingAuth.id, {
              password,
              email_confirm: true
            });
            console.log(`[AUTH] Auto-recovered password for existing auth user ${lowerEmail}`);
          } else {
            // Create user with email_confirm: true
            await adminSupabase.auth.admin.createUser({
              email: lowerEmail,
              password,
              email_confirm: true,
              user_metadata: { full_name: userName, role: userRole }
            });
            console.log(`[AUTH] Auto-provisioned missing auth user ${lowerEmail}`);
          }

          // Retry sign-in with newly provisioned credentials
          const retryResult = await supabase.auth.signInWithPassword({ email: lowerEmail, password });
          if (!retryResult.error && retryResult.data?.user) {
            data = retryResult.data;
            error = null;
          }
        } catch (recoveryError: any) {
          console.error('[AUTH] Auto-recovery failed:', recoveryError);
        }
      }
    }

    if (error) {
      console.error(`[AUTH] Final Supabase Auth Error for ${lowerEmail}: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Fetch the role from users table or metadata
    const { data: profile } = await supabase
      .from('users')
      .select('role, tenant_id')
      .eq('id', data.user.id)
      .maybeSingle();

    const role = requestedRole === 'superadmin' ? 'superadmin' : (profile?.role || data.user.user_metadata?.role || 'operador');

    // AUTO-LINKING: Link Auth user to Resource record
    try {
      const { data: resource } = await adminSupabase
        .from('resources')
        .select('id, assigned_to')
        .ilike('email', lowerEmail)
        .order('status', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (resource && !resource.assigned_to) {
        await adminSupabase
          .from('resources')
          .update({ assigned_to: data.user.id })
          .eq('id', resource.id);
        console.log(`[AUTH] Linked user ${data.user.id} to resource ${resource.id}`);
      }
    } catch (e) {
      console.error('[AUTH] Auto-linking failed:', e);
    }

    return NextResponse.json({ 
      user: {
        ...data.user,
        role: role,
        tenant_id: profile?.tenant_id || data.user.user_metadata?.tenant_id || null
      }, 
      session: data.session 
    });
  } catch (error: any) {
    console.error('[AUTH_API] Catch error:', error);
    const msg = error?.message || 'Error interno del servidor';
    return NextResponse.json({ 
      error: msg.includes('fetch failed') 
        ? '⚠️ ERROR DE CONEXIÓN EN VERCEL: Configura las variables de entorno en Vercel.' 
        : msg 
    }, { status: 500 });
  }
}
