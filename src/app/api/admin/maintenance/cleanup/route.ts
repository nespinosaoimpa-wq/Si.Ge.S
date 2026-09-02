import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantFromRequest } from '@/lib/resolve-tenant';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/maintenance/cleanup
 * Purga automática y segura de cementerio de datos (GPS antiguos, alertas resueltas añejas).
 * Mantiene intacto el 100% del historial de turnos (guard_shifts) y libro de guardia (guard_book_entries).
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'sigpad-cron-secret-key-2026';
    const isCron = authHeader === `Bearer ${cronSecret}`;

    if (!isCron) {
      const ctx = await resolveTenantFromRequest(request);
      if (!ctx?.isSuper) {
        return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de SuperAdmin o Bearer Token de Cron.' }, { status: 403 });
      }
    }

    const supabase = createServiceClient();
    const cutoff60Days = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
    const cutoff90Days = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();

    const results: Record<string, any> = {};

    // 1. Purgar puntos GPS antiguos de más de 60 días
    try {
      const { count, error } = await supabase
        .from('gps_tracking')
        .delete({ count: 'exact' })
        .lt('recorded_at', cutoff60Days);
      
      results.deleted_gps_tracking = error ? `Error: ${error.message}` : (count || 0);
    } catch (e: any) {
      results.deleted_gps_tracking = `Excepción: ${e.message}`;
    }

    // 2. Limpiar alertas y pánicos resueltos de más de 90 días
    try {
      const { count, error } = await supabase
        .from('alarms')
        .delete({ count: 'exact' })
        .in('status', ['resolved', 'resuelto', 'acknowledged'])
        .lt('created_at', cutoff90Days);

      results.deleted_resolved_alarms = error ? `Error: ${error.message}` : (count || 0);
    } catch (e: any) {
      results.deleted_resolved_alarms = `Excepción: ${e.message}`;
    }

    // 3. Limpiar notificaciones temporales leídas de más de 30 días
    try {
      const cutoff30Days = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const { count, error } = await supabase
        .from('system_notifications')
        .delete({ count: 'exact' })
        .eq('is_read', true)
        .lt('created_at', cutoff30Days);

      results.deleted_read_notifications = error ? `Error: ${error.message}` : (count || 0);
    } catch (e: any) {
      results.deleted_read_notifications = `Excepción: ${e.message}`;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: results
    });

  } catch (error: any) {
    console.error('[MAINTENANCE_CLEANUP_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
