import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Maintenance & DB Cleanup Endpoint:
 * - Deletes orphaned push subscriptions
 * - Deletes temporary tracking logs older than 90 days
 * Prevents unnecessary disk space accumulation (Cementerio de Datos).
 */
export async function POST() {
  try {
    const supabase = createServiceClient();
    const NinetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Prune temporary GPS tracking logs older than 90 days
    const { error: trackingErr } = await supabase
      .from('gps_tracking_logs')
      .delete()
      .lt('created_at', NinetyDaysAgo);

    if (trackingErr) {
      console.warn('[Cleanup] gps_tracking_logs prune notice:', trackingErr.message);
    }

    // 2. Prune old temporary system notifications older than 90 days
    const { error: notifErr } = await supabase
      .from('system_notifications')
      .delete()
      .lt('created_at', NinetyDaysAgo);

    if (notifErr) {
      console.warn('[Cleanup] system_notifications prune notice:', notifErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Mantenimiento y limpieza de datos temporales ejecutado con éxito.'
    });
  } catch (error: any) {
    console.error('[CLEANUP_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
