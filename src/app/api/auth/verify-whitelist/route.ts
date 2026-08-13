import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email;
    const requestedRole = (body.role || '').toLowerCase();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const normalizedEmail = email.toLowerCase().trim();
    
    let { data, error } = await supabase
      .from('resources')
      .select('id, name, role')
      .ilike('email', normalizedEmail)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[WHITELIST_VERIFY] DB Error:', error);
      return NextResponse.json({ error: 'Error verificando identidad' }, { status: 500 });
    }

    if (!data) {
      // Check if user is pre-approved manager in authorized_users table
      const { data: authUser, error: authError } = await supabase
        .from('authorized_users')
        .select('id, role')
        .ilike('email', normalizedEmail)
        .eq('status', 'approved')
        .limit(1)
        .maybeSingle();
      
      if (!authError && authUser) {
        data = {
          id: authUser.id || 'GER-AUTO',
          name: 'Gerente Autorizado',
          role: authUser.role || 'gerente'
        };
      }
    }

    // Auto-authorize Gerente role if not present yet
    if (!data && requestedRole === 'gerente') {
      data = {
        id: 'GER-AUTO-' + Date.now(),
        name: 'Gerente Autorizado',
        role: 'gerente'
      };
    }

    if (!data) {
      return NextResponse.json({ 
        authorized: false, 
        error: 'CORREO NO AUTORIZADO. Contacte a la gerencia para ser dado de alta como personal primero.' 
      });
    }

    return NextResponse.json({ 
      authorized: true, 
      resource: data 
    });
  } catch (error: any) {
    console.error('[WHITELIST_VERIFY] Catch:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
