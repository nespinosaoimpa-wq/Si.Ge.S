import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/keep-alive
 * Endpoint automatizado para mantener activa la base de datos de Supabase en el plan gratuito.
 * Evita la pausa automática por 7 días de inactividad ejecutando una consulta liviana.
 */
export async function GET() {
  try {
    const supabase = createServiceClient();
    
    // Consulta ultraliviana a la base de datos para registrar actividad real en el motor Postgres
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.error('[Keep-Alive Error]:', error.message);
      return NextResponse.json({
        status: 'error',
        message: 'Fallo al consultar Supabase',
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return NextResponse.json({
      status: 'active',
      message: '🛡️ Supabase Keep-Alive Ping ejecutado con éxito. Proyecto activo.',
      recordsFound: data?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[Keep-Alive Exception]:', err);
    return NextResponse.json({
      status: 'exception',
      error: err.message || 'Error inesperado',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
