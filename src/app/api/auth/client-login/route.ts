import { createServiceClient } from '@/lib/supabase-server';
import { isConfigured } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, accessCode } = await request.json();

    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = accessCode.trim();

    const isDemoMode = process.env.SIGPAD_DEMO_MODE === 'true' || 
                       (process.env.SIGPAD_DEMO_MODE !== 'false' && 
                        process.env.NODE_ENV !== 'production' && 
                        !isConfigured);

    // Demo bypass
    if (isDemoMode && (cleanCode === '1234' || cleanCode === 'SIGPAD2026' || cleanCode === 'demo')) {
      const response = NextResponse.json({
        success: true,
        client: {
          objective_id: 'demo-objective-id',
          name: 'Consorcio Portofino VIP',
          email: cleanEmail
        }
      });

      // Set cookie for middleware validation
      response.cookies.set('SIGPAD_client_session', JSON.stringify({
        objective_id: 'demo-objective-id',
        name: 'Consorcio Portofino VIP',
        email: cleanEmail
      }), {
        path: '/',
        maxAge: 60 * 60 * 24, // 1 day
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production'
      });

      return response;
    }

    if (!isConfigured) {
      return NextResponse.json({
        error: 'Servidor no configurado para autenticación real. Use el código demo.'
      }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Find objective with matching email (if stored in metadata/description) or code
    // Let's assume accessCode matches the objective ID directly, or matches a specific property.
    // To make it flexible: check if cleanCode matches an objective ID
    const { data: objective, error } = await supabase
      .from('objectives')
      .select('*')
      .eq('id', cleanCode)
      .maybeSingle();

    if (error || !objective) {
      // Try searching by name or metadata
      const { data: objectivesByName } = await supabase
        .from('objectives')
        .select('*')
        .ilike('name', `%${cleanCode}%`)
        .limit(1);

      const foundObjective = objectivesByName?.[0];
      if (!foundObjective) {
        return NextResponse.json({
          error: 'Código de acceso no válido. Verifique con su empresa de seguridad.'
        }, { status: 401 });
      }

      const response = NextResponse.json({
        success: true,
        client: {
          objective_id: foundObjective.id,
          name: foundObjective.name,
          email: cleanEmail
        }
      });

      response.cookies.set('SIGPAD_client_session', JSON.stringify({
        objective_id: foundObjective.id,
        name: foundObjective.name,
        email: cleanEmail
      }), {
        path: '/',
        maxAge: 60 * 60 * 24,
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production'
      });

      return response;
    }

    const response = NextResponse.json({
      success: true,
      client: {
        objective_id: objective.id,
        name: objective.name,
        email: cleanEmail
      }
    });

    response.cookies.set('SIGPAD_client_session', JSON.stringify({
      objective_id: objective.id,
      name: objective.name,
      email: cleanEmail
    }), {
      path: '/',
      maxAge: 60 * 60 * 24,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production'
    });

    return response;
  } catch (error: any) {
    console.error('[CLIENT_AUTH_API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
