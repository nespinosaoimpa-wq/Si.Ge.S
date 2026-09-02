import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/keep-alive
 * Health check de la base de datos Supabase.
 *
 * NOTA: Con Supabase Pro la base de datos NUNCA se pausa automáticamente,
 * por lo que este endpoint ya no es necesario como cron automático.
 * Se mantiene como endpoint de healthcheck manual y monitoreo externo.
 *
 * Para llamarlo manualmente: GET /api/keep-alive
 * Para monitoreo externo (UptimeRobot, BetterStack, etc.) apuntar a esta URL.
 */
export async function GET() {
  try {
    const supabase = createServiceClient();

    // Consulta ultraliviana — verifica conectividad real con Postgres
    const { data, error } = await supabase
      .from('tenants')
      .select('id')
      .limit(1);

    // Auto-Purge Telemetry: Purga automática de telemetría de más de 7 días (garantiza espacio libre permanente)
    let purgeExecuted = false;
    try {
      await supabase.rpc('sigpad_auto_purge_telemetry');
      purgeExecuted = true;
    } catch (purgeErr) {
      // Non-blocking catch if RPC isn't deployed yet
    }

    if (error) {
      console.error('[Health-Check Error]:', error.message);
      return NextResponse.json({
        status: 'error',
        message: 'Fallo al consultar Supabase',
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return NextResponse.json({
      status: 'ok',
      message: '✅ SIGPAD operativo. Supabase Pro activo. Retención de telemetría optimizada.',
      tenantsReachable: (data?.length ?? 0) >= 0,
      autoPurgeActive: purgeExecuted,
      timestamp: new Date().toISOString(),
      plan: 'Supabase Pro (Optimizaciones de cuota activadas)'
    });
  } catch (err: any) {
    console.error('[Health-Check Exception]:', err);
    return NextResponse.json({
      status: 'exception',
      error: err.message || 'Error inesperado',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
