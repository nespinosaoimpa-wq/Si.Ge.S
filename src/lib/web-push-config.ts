import webpush from 'web-push';
import { createServiceClient } from '@/lib/supabase-server';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'https://www.sigpad.com.ar';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  url?: string;
  tag?: string;
  vibrate?: number[];
  requireInteraction?: boolean;
  data?: Record<string, any>;
}

/**
 * Send a real Web Push notification to all devices registered for a given user/resource.
 * Cleans up expired subscriptions automatically (404/410).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number; cleaned: number }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[WebPush] VAPID keys not configured, skipping push');
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  const supabase = createServiceClient();
  let sent = 0, failed = 0, cleaned = 0;

  // Query subscriptions by user_id OR resource_id
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .or(`user_id.eq.${userId},resource_id.eq.${userId}`);

  if (!subs || subs.length === 0) {
    console.log(`[WebPush] No subscriptions found for user ${userId}`);
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  const pushPayloadStr = JSON.stringify(payload);

  for (const sub of subs) {
    const subscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys_p256dh || sub.p256dh,
        auth: sub.keys_auth || sub.auth_key
      }
    };

    try {
      await webpush.sendNotification(subscription, pushPayloadStr);
      sent++;
    } catch (err: any) {
      const statusCode = err?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // Subscription expired, clean up
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('id', sub.id);
        cleaned++;
      } else {
        console.error(`[WebPush] Error sending to ${sub.endpoint.slice(0, 50)}:`, err?.message || err);
        failed++;
      }
    }
  }

  console.log(`[WebPush] Results for ${userId}: sent=${sent}, failed=${failed}, cleaned=${cleaned}`);
  return { sent, failed, cleaned };
}

export { VAPID_PUBLIC_KEY };
