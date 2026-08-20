import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { action, notification } = await request.json();
    const supabase = createServiceClient();

    if (!notification || !notification.title) {
      return NextResponse.json({ error: 'notification y title son requeridos' }, { status: 400 });
    }

    const title = notification.title || '🚨 SIGPAD Táctico';
    const notifBody = notification.body || '';
    const notifUrl = notification.url || '/operador';
    const resourceId = notification.resource_id || null;
    const requireInteraction = notification.requireInteraction ?? true;

    // 1. Insert notification record in DB
    if (resourceId) {
      await supabase.from('notifications').insert({
        resource_id: resourceId,
        type: 'emergencia',
        title: title,
        body: notifBody,
        data: { url: notifUrl, requireInteraction },
        is_read: false,
        created_at: new Date().toISOString()
      });
    }

    // 2. Broadcast via Supabase Realtime channel
    try {
      const channel = supabase.channel('push-notifications-broadcast');
      await channel.send({
        type: 'broadcast',
        event: 'web_push_dispatch',
        payload: {
          title,
          body: notifBody,
          url: notifUrl,
          requireInteraction,
          resource_id: resourceId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (e) {
      console.warn('[PushAPI] Realtime broadcast notice:', e);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PUSH_NOTIFICATION_API_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
