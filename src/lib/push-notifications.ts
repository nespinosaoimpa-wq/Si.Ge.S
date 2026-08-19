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

let sharedAudioContext: AudioContext | null = null;
let activeSirenOsc1: OscillatorNode | null = null;
let activeSirenOsc2: OscillatorNode | null = null;
let activeSirenLfo: OscillatorNode | null = null;
let activeSirenGain: GainNode | null = null;

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioContext) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioContext = new AudioCtx();
    }
  }
  return sharedAudioContext;
}

export function unlockAudioContext() {
  if (typeof window === 'undefined') return;
  const ctx = getSharedAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().then(() => {
      console.log('[SIGPAD Audio] AudioContext unlocked successfully');
    }).catch(() => {});
  }
}

export function startCrazyHombreVivoAlarm() {
  if (typeof window === 'undefined') return;
  
  unlockAudioContext();
  const ctx = getSharedAudioContext();
  if (!ctx) return;

  stopCrazyHombreVivoAlarm();

  try {
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1.0, now);
    masterGain.connect(ctx.destination);
    activeSirenGain = masterGain;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(800, now);
    
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(4, now); // 4 Hz sweep rate

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(300, now);

    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    osc1.connect(masterGain);

    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1200, now);
    
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.6, now);
    osc2.connect(osc2Gain);
    osc2Gain.connect(masterGain);

    lfoGain.connect(osc2.frequency);

    lfo.start(now);
    osc1.start(now);
    osc2.start(now);

    activeSirenOsc1 = osc1;
    activeSirenOsc2 = osc2;
    activeSirenLfo = lfo;

    console.log('[SIGPAD Audio] 🔊 Sirena Dual de Hombre Vivo INICIADA (Web Audio API Max Gain)');
  } catch (e) {
    console.warn('[SIGPAD Audio] Siren start warning:', e);
  }
}

export function stopCrazyHombreVivoAlarm() {
  try {
    if (activeSirenGain && sharedAudioContext) {
      activeSirenGain.gain.linearRampToValueAtTime(0.001, sharedAudioContext.currentTime + 0.1);
    }
    if (activeSirenOsc1) {
      activeSirenOsc1.stop();
      activeSirenOsc1.disconnect();
      activeSirenOsc1 = null;
    }
    if (activeSirenOsc2) {
      activeSirenOsc2.stop();
      activeSirenOsc2.disconnect();
      activeSirenOsc2 = null;
    }
    if (activeSirenLfo) {
      activeSirenLfo.stop();
      activeSirenLfo.disconnect();
      activeSirenLfo = null;
    }
    if (activeSirenGain) {
      activeSirenGain.disconnect();
      activeSirenGain = null;
    }
    console.log('[SIGPAD Audio] 🔇 Sirena Dual DETENIDA');
  } catch (e) {}
}

export function playAlertTone(type: 'normal' | 'emergency' = 'normal') {
  if (typeof window === 'undefined') return;

  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    if (type === 'emergency') {
      startCrazyHombreVivoAlarm();
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
