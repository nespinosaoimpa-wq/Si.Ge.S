/**
 * SIGPAD OS Native Push Notification Utility
 * Provides cross-platform OS notifications (Android, iOS PWA, Windows, Mac)
 * with support for thumbnail images, vibration, and custom actions.
 */

export interface NativeNotificationOptions {
  title: string;
  body: string;
  image?: string | null;     // Miniature / Photo attachment
  icon?: string;             // App logo
  url?: string;              // Target route on click
  tag?: string;              // De-duplication tag
  sound?: boolean;           // Play audio beep
  type?: 'normal' | 'emergency';
  requireInteraction?: boolean;
  vibrate?: number[];
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function getNotificationPermissionState(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

export async function requestPushPermission(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerServiceWorker();
      return true;
    }
    return false;
  } catch (e) {
    console.warn('[Push] Permission request error:', e);
    return false;
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    return registration;
  } catch (e) {
    console.warn('[Push] Service worker registration failed:', e);
    return null;
  }
}

export async function showNativeNotification(options: NativeNotificationOptions): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (options.sound) {
    playAlertTone(options.type || 'normal');
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const notificationTitle = options.title || '🚨 SIGPAD Táctico';
  const notificationOptions: any = {
    body: options.body,
    icon: options.icon || '/Logo SIGPAD.png',
    image: options.image || undefined,
    badge: '/icons/icon-192x192.png',
    vibrate: options.vibrate || (options.type === 'emergency' ? [500, 150, 500, 150, 500, 150, 800, 200, 500] : [200, 100, 200, 100, 300]),
    tag: options.tag || 'sigpad-notification-' + Date.now(),
    requireInteraction: options.requireInteraction ?? (options.type === 'emergency'),
    renotify: true,
    data: {
      url: options.url || '/operador'
    }
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(notificationTitle, notificationOptions);
        return true;
      }
    }

    const n = new Notification(notificationTitle, notificationOptions);
    n.onclick = () => {
      window.focus();
      if (options.url) window.location.href = options.url;
    };
    return true;
  } catch (e) {
    console.warn('[Push] Failed to show native notification:', e);
    return false;
  }
}

export function playAlertTone(type: 'normal' | 'emergency' = 'normal') {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    if (type === 'emergency') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
      osc.frequency.linearRampToValueAtTime(700, now + 0.6);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.9);
      osc.frequency.linearRampToValueAtTime(700, now + 1.2);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

      osc.start(now);
      osc.stop(now + 1.5);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    // Ignored if user hasn't interacted with page yet
  }
}
