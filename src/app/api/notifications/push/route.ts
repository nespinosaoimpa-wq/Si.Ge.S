import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { sendPushToUser, VAPID_PUBLIC_KEY } from '@/lib/web-push-config';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createServiceClient();
    const { action } = body;

    // ─── SUBSCRIBE: Store push subscription from operator's device ───
    if (action === 'subscribe') {
      const { subscription, user_id, resource_id } = body;
      if (!subscription?.endpoint || !subscription?.keys) {
        return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
      }

      // Upsert by endpoint to avoid duplicates
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user_id || 'unknown',
          resource_id: resource_id || user_id || null,
          endpoint: subscription.endpoint,
          keys_p256dh: subscription.keys.p256dh,
          keys_auth: subscription.keys.auth,
          updated_at: new Date().toISOString()
        }, { onConflict: 'endpoint' });

      if (error) {
        console.error('[PushSubscribe] Error:', error);
        // Try insert with alternate column names for compatibility
        await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user_id || 'unknown',
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth_key: subscription.keys.auth,
          }, { onConflict: 'endpoint' }).then(() => {});
      }

      return NextResponse.json({ success: true, message: 'Push subscription stored' });
    }

    // ─── UNSUBSCRIBE: Remove push subscription ───
    if (action === 'unsubscribe') {
      const { endpoint } = body;
      if (endpoint) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', endpoint);
      }
      return NextResponse.json({ success: true });
    }

    // ─── SEND: Send real Web Push notification to a specific user ───
    if (action === 'send') {
      const { resource_id, notification } = body;
      if (!resource_id) {
        return NextResponse.json({ error: 'resource_id is required' }, { status: 400 });
      }

      const payload = {
        title: notification?.title || '🚨 SIGPAD',
        body: notification?.body || 'Tenés una nueva alerta.',
        icon: notification?.icon || '/Logo SIGPAD.png',
        image: notification?.image || undefined,
        url: notification?.url || '/operador',
        tag: notification?.tag || 'sigpad-push-' + Date.now(),
        vibrate: notification?.vibrate || [500, 150, 500, 150, 800],
        requireInteraction: notification?.requireInteraction ?? false
      };

      const result = await sendPushToUser(resource_id, payload);
      return NextResponse.json({ success: true, ...result });
    }

    // ─── GET VAPID PUBLIC KEY ───
    if (action === 'vapid-key') {
      return NextResponse.json({ publicKey: VAPID_PUBLIC_KEY });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PUSH_NOTIFICATION_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Push error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ publicKey: VAPID_PUBLIC_KEY });
}
