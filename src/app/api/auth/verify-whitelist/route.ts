import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('resources')
      .select('id, name, role')
      .ilike('email', email.toLowerCase().trim())
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[WHITELIST_VERIFY] DB Error:', error);
      return NextResponse.json({ error: 'Error verificando identidad' }, { status: 500 });
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
