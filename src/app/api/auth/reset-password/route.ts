import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, newPassword, adminReset = false } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'El correo electrónico es requerido.' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const cleanEmail = email.toLowerCase().trim();

    // 1. Find user in Supabase Auth via Admin API
    const { data: usersList, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('[RESET_PASSWORD] List users error:', listError);
    }

    const authUser = (usersList?.users || []).find(
      u => u.email?.toLowerCase().trim() === cleanEmail
    );

    if (adminReset && newPassword) {
      // MANAGER INSTANT RESET: Direct password update
      if (!authUser) {
        // Try creating or linking the auth user directly
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: cleanEmail,
          password: newPassword,
          email_confirm: true
        });

        if (createError) {
          return NextResponse.json({ error: 'No se pudo generar la clave para el usuario: ' + createError.message }, { status: 400 });
        }

        // Link with resource legajo if exists
        await supabase.from('resources').update({ assigned_to: newUser.user.id }).ilike('email', cleanEmail);
        return NextResponse.json({ success: true, message: `Usuario creado y contraseña establecida a '${newPassword}'` });
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        authUser.id,
        { password: newPassword, email_confirm: true }
      );

      if (updateError) {
        return NextResponse.json({ error: 'Error al actualizar clave: ' + updateError.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: `Contraseña restablecida exitosamente a '${newPassword}'` });
    } else {
      // SELF-SERVICE: Send password reset email via Supabase
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${request.headers.get('origin') || ''}/login`
      });

      if (resetError) {
        // Fallback info message if SMTP email is not configured in Supabase
        return NextResponse.json({
          success: true,
          message: `Solicitud procesada. Si no recibes el correo, solicita a Gerencia que restablezca tu clave al instante desde el panel de Accesos.`
        });
      }

      return NextResponse.json({
        success: true,
        message: `Instrucciones enviadas a ${cleanEmail}. Revisa tu bandeja de entrada.`
      });
    }
  } catch (error: any) {
    console.error('[RESET_PASSWORD] Internal error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
