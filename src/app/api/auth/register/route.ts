import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

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
    // El Gerente es quien administra su cuenta/empresa, por lo que se auto-autoriza inmediatamente.
    if (!resourceData) {
      if (requestedRole === 'gerente') {
        let targetTenantId = 'a1b2c3d4-0001-0001-0001-000000000001';
        try {
          const { data: firstTenant } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
          if (firstTenant?.id) targetTenantId = firstTenant.id;
        } catch (e) {}

        // Auto-crear en authorized_users
        await supabase.from('authorized_users').upsert({
          email: normalizedEmail,
          role: 'gerente',
          status: 'approved',
          tenant_id: targetTenantId
        }, { onConflict: 'email' });

        // Auto-crear en resources
        const { data: newRes } = await supabase
          .from('resources')
          .insert({
            name: fullName || 'Gerente de Seguridad',
            email: normalizedEmail,
            role: 'Gerente',
            status: 'active',
            tenant_id: targetTenantId
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

    // 4. CREATE USER VIA ADMIN API — auto-confirmed, zero email rate-limits
    const finalRole = requestedRole === 'gerente' ? 'gerente' : (resourceData.role?.toLowerCase() || 'operador');
    const finalName = fullName || resourceData.name || 'Usuario SIGPAD';

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true, // Confirmación automática inmediata
      user_metadata: {
        full_name: finalName,
        role: finalRole
      }
    });

    if (authError) {
      console.error('[REGISTER] Admin createUser error:', authError);
      let errorMsg = authError.message || 'Error al crear la cuenta';
      if (errorMsg.includes('already been registered') || errorMsg.includes('already exists')) {
        errorMsg = 'Ya existe una cuenta activa con este correo electrónico. Por favor, iniciá sesión directamente.';
      }
      return NextResponse.json({ 
        error: errorMsg
      }, { status: 400 });
    }

    if (!authData?.user) {
      return NextResponse.json({ error: 'Error inesperado al crear usuario' }, { status: 500 });
    }

    // 5. CREATE PROFILE & USER RECORD
    const { error: userInsertError } = await supabase
      .from('users')
      .upsert({
        id: authData.user.id,
        email: normalizedEmail,
        role: finalRole,
        tenant_id: resourceData.tenant_id || 'a1b2c3d4-0001-0001-0001-000000000001'
      }, { onConflict: 'id' });

    if (userInsertError) {
      console.warn('[REGISTER] public.users upsert warning:', userInsertError);
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name: finalName
      }, { onConflict: 'id' });

    if (profileError) {
      console.warn('[REGISTER] public.profiles upsert warning:', profileError);
    }

    // 6. LINK RESOURCE
    if (resourceData.id && !resourceData.id.startsWith('GER-')) {
      await supabase
        .from('resources')
        .update({ assigned_to: authData.user.id })
        .eq('id', resourceData.id);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: normalizedEmail,
        name: finalName,
        role: finalRole
      }
    });

  } catch (error: any) {
    console.error('[REGISTER] Unexpected error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
