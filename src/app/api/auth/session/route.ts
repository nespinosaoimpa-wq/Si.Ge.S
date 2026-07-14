import { createServiceClient } from '@/lib/supabase-server';
import { isConfigured } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!isConfigured) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const userCookie = req.cookies.get('SIGPAD_user');
    if (!userCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let parsedUser: any = null;
    try {
      parsedUser = JSON.parse(decodeURIComponent(userCookie.value));
    } catch {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    const userId = parsedUser?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Usuario no identificado' }, { status: 401 });
    }

    const supabase = createServiceClient();
    
    // Fetch the user's row from the database (bypassing client RLS)
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id, email, role, tenant_id')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!dbUser) {
      return NextResponse.json({ error: 'Usuario no encontrado en la base de datos' }, { status: 404 });
    }

    // Merge and return
    const userData = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      tenant_id: dbUser.tenant_id,
      user_metadata: {
        role: dbUser.role
      }
    };

    return NextResponse.json(userData);
  } catch (err: any) {
    console.error('Error fetching session details:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
