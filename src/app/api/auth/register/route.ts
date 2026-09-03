import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { MASTER_TENANT_ID } from '@/lib/resolve-tenant';

/**
 * POST /api/auth/register
 * Server-side registration using Admin API.
 * Creates users with email_confirm: true (no confirmation email sent).
 * Automatically authorizes Gerente (Manager) registrations for any email (Gmail, Hotmail, domain, etc.).
 */
export async function POST(request: Request) {
  try {
    const { email, password, fullName, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const normalizedEmail = email.toLowerCase().trim();
    const requestedRole = (role || 'operador').toLowerCase();

    // 1. WHITELIST CHECK — check resources or authorized_users
    let resourceData: any = null;

    const { data: resource } = await supabase
      .from('resources')
      .select('id, name, role, email, tenant_id')
      .ilike('email', normalizedEmail)
      .limit(1)
      .maybeSingle();

    if (resource) {
      resourceData = resource;
    } else {
      // Fallback: check authorized_users
      const { data: authUser } = await supabase
        .from('authorized_users')
        .select('id, role, tenant_id')
        .ilike('email', normalizedEmail)
        .eq('status', 'approved')
        .limit(1)
        .maybeSingle();

      if (authUser) {
        resourceData = {
          id: authUser.id || 'GER-AUTO',
          name: fullName || 'Gerente Autorizado',
          role: authUser.role || 'gerente',
          tenant_id: authUser.tenant_id
        };
      }
    }

    // 2. AUTO-WHITELIST FOR GERENTE REGISTRATIONS
    // Si no está en el whitelist previo, pero seleccionó rol GERENTE:
    // El Gerente es quien administra su cuenta/empresa, por lo que se auto-autoriza,
    // pero NO se le asigna el tenant maestro. Quedará sin empresa hasta que el SuperAdmin la asigne.
    if (!resourceData) {
      if (requestedRole === 'gerente') {
        // Buscar si hay un tenant registrado con este admin_email
        let targetTenantId: string | null = null;
        try {
          const { data: tenantByEmail } = await supabase
            .from('tenants')
            .select('id')
            .ilike('admin_email', normalizedEmail)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (tenantByEmail?.id) targetTenantId = tenantByEmail.id;
        } catch (e) {}

        // Auto-crear en authorized_users
        await supabase.from('authorized_users').upsert({
          email: normalizedEmail,
          role: 'gerente',
          status: 'approved',
          ...(targetTenantId ? { tenant_id: targetTenantId } : {})
        }, { onConflict: 'email' });

        // Auto-crear en resources
        const { data: newRes } = await supabase
          .from('resources')
          .insert({
            name: fullName || 'Gerente de Seguridad',
            email: normalizedEmail,
            role: 'Gerente',
            status: 'active',
            ...(targetTenantId ? { tenant_id: targetTenantId } : {})
          })
          .select('id, name, role, email, tenant_id')
          .single();

        resourceData = newRes || {
          id: 'GER-' + Date.now(),
          name: fullName || 'Gerente Autorizado',
          role: 'gerente',
          tenant_id: targetTenantId
        };
      } else {
        return NextResponse.json({
          error: 'CORREO NO AUTORIZADO. Para ingresar como Operador, solicite a su Gerente que dé de alta su mail desde el panel de Accesos. O seleccione el rol Gerente para crear una cuenta de Gerencia.'
        }, { status: 403 });
      }
    }

    // 3. CHECK IF USER ALREADY EXISTS
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .limit(1)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({
        error: 'Ya existe una cuenta activa con este correo electrónico. Por favor, iniciá sesión directamente.'
      }, { status: 409 });
    }

    // 4. CREATE USER — Try Admin API, fallback to signUp, fallback to DB direct provisioning
    const finalRole = requestedRole === 'operador' ? 'operador' : (requestedRole === 'gerente' ? 'gerente' : (resourceData?.role?.toLowerCase().includes('gerente') ? 'gerente' : 'operador'));
    const finalName = fullName || resourceData?.name || 'Usuario SIGPAD';
    // Usar tenant_id del recurso encontrado; null si no tiene empresa asignada todavía
    const targetTenantId: string | null = (resourceData.tenant_id && resourceData.tenant_id !== MASTER_TENANT_ID)
      ? resourceData.tenant_id
      : null;

    let userId = 'user-' + Date.now();
    let authCreated = false;

    // Method A: Admin API
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: finalName,
          role: finalRole
        }
      });

      if (!authError && authData?.user?.id) {
        userId = authData.user.id;
        authCreated = true;
      } else if (authError) {
        console.warn('[REGISTER] Admin API notice:', authError.message);
        if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
          return NextResponse.json({
            error: 'Ya existe una cuenta activa con este correo electrónico. Por favor, iniciá sesión directamente.'
          }, { status: 409 });
        }
      }
    } catch (e: any) {
      console.warn('[REGISTER] Admin API exception fallback:', e?.message);
    }

    // Method B: Standard signUp fallback if Method A didn't create user
    if (!authCreated) {
      try {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { full_name: finalName, role: finalRole }
          }
        });

        if (!signUpError && signUpData?.user?.id) {
          userId = signUpData.user.id;
          authCreated = true;
        } else if (signUpError) {
          console.warn('[REGISTER] SignUp fallback notice:', signUpError.message);
        }
      } catch (e: any) {
        console.warn('[REGISTER] SignUp exception fallback:', e?.message);
      }
    }

    // 5. CREATE PROFILE & USER RECORDS IN DATABASE
    try {
      await supabase
        .from('users')
        .upsert({
          id: userId,
          email: normalizedEmail,
          role: finalRole,
          tenant_id: targetTenantId
        }, { onConflict: 'id' });
    } catch (e: any) {
      console.warn('[REGISTER] public.users upsert warning:', e?.message);
    }

    try {
      await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: finalName
        }, { onConflict: 'id' });
    } catch (e: any) {
      console.warn('[REGISTER] public.profiles upsert warning:', e?.message);
    }

    // 6. LINK RESOURCE & AUTHORIZED USER
    try {
      await supabase
        .from('authorized_users')
        .upsert({
          email: normalizedEmail,
          role: finalRole,
          status: 'approved',
          tenant_id: targetTenantId
        }, { onConflict: 'email' });

      if (resourceData?.id && !resourceData.id.startsWith('GER-')) {
        await supabase
          .from('resources')
          .update({ assigned_to: userId })
          .eq('id', resourceData.id);
      }
    } catch (e: any) {
      console.warn('[REGISTER] Auth linkage notice:', e?.message);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: normalizedEmail,
        name: finalName,
        role: finalRole,
        tenant_id: targetTenantId
      }
    });

  } catch (error: any) {
    console.error('[REGISTER] Unexpected error:', error);
    const msg = error?.message || '';
    if (msg.includes('fetch failed')) {
      return NextResponse.json({
        error: '⚠️ No se pudo conectar con el servidor de autenticación. Sin embargo, su correo ha sido registrado en la base de datos. Por favor intente iniciar sesión directamente.'
      }, { status: 500 });
    }
    return NextResponse.json({ error: msg || 'Error interno al procesar el alta.' }, { status: 500 });
  }
}
