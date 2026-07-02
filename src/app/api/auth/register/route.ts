import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * POST /api/auth/register
 * Server-side registration using Admin API.
 * Creates users with email_confirm: true (no confirmation email sent).
 * This bypasses Supabase's email rate limits entirely.
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

    // 1. WHITELIST CHECK — email must exist in resources or authorized_users
    let resourceData: any = null;

    const { data: resource } = await supabase
      .from('resources')
      .select('id, name, role, email')
      .ilike('email', normalizedEmail)
      .limit(1)
      .maybeSingle();

    if (resource) {
      resourceData = resource;
    } else {
      // Fallback: check authorized_users
      const { data: authUser } = await supabase
        .from('authorized_users')
        .select('id, role')
        .ilike('email', normalizedEmail)
        .eq('status', 'approved')
        .limit(1)
        .maybeSingle();

      if (authUser) {
        resourceData = {
          id: authUser.id || 'GER-AUTO',
          name: fullName || 'Gerente Autorizado',
          role: authUser.role || 'gerente'
        };
      }
    }

    if (!resourceData) {
      return NextResponse.json({
        error: 'CORREO NO AUTORIZADO. Contacte a la gerencia para ser dado de alta como personal primero.'
      }, { status: 403 });
    }

    // 2. CHECK if user already exists in Supabase Auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers({ 
      page: 1, 
      perPage: 1 
    });
    
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === normalizedEmail
    );

    if (existingUser) {
      return NextResponse.json({
        error: 'Ya existe una cuenta con este correo electrónico. Intentá iniciar sesión.'
      }, { status: 409 });
    }

    // 3. CREATE USER via Admin API — auto-confirmed, no email sent
    const finalRole = role || resourceData.role?.toLowerCase() || 'operador';
    const finalName = fullName || resourceData.name || 'Usuario SIGPAD';

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true, // Auto-confirm — NO confirmation email sent
      user_metadata: {
        full_name: finalName,
        role: finalRole
      }
    });

    if (authError) {
      console.error('[REGISTER] Admin createUser error:', authError);
      return NextResponse.json({ 
        error: authError.message || 'Error al crear la cuenta'
      }, { status: 500 });
    }

    if (!authData?.user) {
      return NextResponse.json({ error: 'Error inesperado al crear usuario' }, { status: 500 });
    }

    // 4. CREATE PROFILE in users table
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: authData.user.id,
        email: normalizedEmail,
        full_name: finalName,
        role: finalRole,
        is_active: true
      }, { onConflict: 'id' });

    if (profileError) {
      console.warn('[REGISTER] Profile upsert warning:', profileError);
      // Non-fatal — the user was created in Auth, they can still login
    }

    // 5. LINK resource to Auth user
    const { error: linkError } = await supabase
      .from('resources')
      .update({ assigned_to: authData.user.id })
      .eq('id', resourceData.id);

    if (linkError) {
      console.warn('[REGISTER] Resource link warning:', linkError);
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
