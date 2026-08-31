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

let activeChimeInterval: any = null;

export function startCrazyHombreVivoAlarm() {
  if (typeof window === 'undefined') return;
  
  unlockAudioContext();
  const ctx = getSharedAudioContext();
  if (!ctx) return;

  stopCrazyHombreVivoAlarm();

  try {
    const playSoftChime = () => {
      const audioCtx = getSharedAudioContext();
      if (!audioCtx) return;
      try {
        const now = audioCtx.currentTime;
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc1.start(now);
        osc1.stop(now + 0.2);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.45);

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([150, 100, 150]);
        }
      } catch (e) {}
    };

    playSoftChime();
    activeChimeInterval = setInterval(playSoftChime, 1800);

    console.log('[SIGPAD Audio] 🎵 Chime Armónico de Hombre Vivo INICIADO');
  } catch (e) {
    console.warn('[SIGPAD Audio] Chime start warning:', e);
  }
}

export function setSirenDucked(ducked: boolean) {
  if (!activeSirenGain || !sharedAudioContext) return;
  try {
    const targetGain = ducked ? 0.05 : 0.8; // Duck siren to 5% when speech is talking
    activeSirenGain.gain.linearRampToValueAtTime(targetGain, sharedAudioContext.currentTime + 0.1);
  } catch (e) {}
}

export function stopCrazyHombreVivoAlarm() {
  try {
    if (activeChimeInterval) {
      clearInterval(activeChimeInterval);
      activeChimeInterval = null;
    }
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
