// SIGPAD Service Worker — V8 (Web Push + Mapbox Cache-First + Background Wake)
const CACHE_NAME = 'sigpad-v8';

const ASSETS_TO_CACHE = [
  '/Logo SIGPAD.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(k => k !== CACHE_NAME && k !== 'mapbox-tiles-v2').map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  if (
    url.pathname.startsWith('/api/') || 
    url.pathname.includes('auth') || 
    url.pathname.includes('_next') ||
    event.request.mode === 'navigate'
  ) {
    return;
  }

  // Cache-First for Mapbox Tiles
  if (url.hostname.includes('mapbox.com') && (url.pathname.includes('/tiles/') || url.pathname.includes('/fonts/'))) {
    event.respondWith(
      caches.open('mapbox-tiles-v2').then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((res) => {
            if (res.status === 200) cache.put(event.request, res.clone());
            return res;
          }).catch(() => new Response('', { status: 404 }));
        });
      })
    );
    return;
  }

  // Network-first for static assets
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request).then(m => m || new Response('', { status: 404 })))
  );
});

// ─── WEB PUSH NOTIFICATION HANDLER (Wakes the phone from background!) ───
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try { data = event.data.json(); } 
    catch (e) { data = { body: event.data.text() }; }
  }

  const title = data.title || '⚡ CONTROL DE HOMBRE VIVO';
  const options = {
    body: data.body || 'Gerencia requiere tu verificación de presencia inmediata. Toca para responder.',
    icon: data.icon || '/Logo SIGPAD.png',
    image: data.image || undefined,
    badge: '/Logo SIGPAD.png',
    vibrate: data.vibrate || [500, 150, 500, 150, 500, 150, 800],
    tag: data.tag || 'sigpad-hombre-vivo-' + Date.now(),
    renotify: true,
    requireInteraction: data.requireInteraction !== false,
    silent: false,
    data: {
      url: data.url || '/operador',
      type: data.data?.type || 'push',
      alarm_id: data.data?.alarm_id || null,
      operator_id: data.data?.operator_id || null,
      timestamp: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // Forward push data to any open client tabs so the HombreVivo modal opens immediately
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        windowClients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_RECEIVED',
            payload: {
              title,
              body: options.body,
              alarm_id: options.data.alarm_id,
              operator_id: options.data.operator_id,
              pushType: options.data.type,
              timestamp: options.data.timestamp
            }
          });
        });
      });
    })
  );
});

// ─── NOTIFICATION CLICK: Focus or open the app ───
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/operador';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing tab
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          // Send message to trigger the HombreVivo modal
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            payload: event.notification.data
          });
          return;
        }
      }
      // No open tab, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── KEEPALIVE LISTENER ───
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'KEEPALIVE') {
    event.source.postMessage({ type: 'KEEPALIVE_ACK', timestamp: Date.now() });
  }
});
