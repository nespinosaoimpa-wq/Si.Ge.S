// 704 Service Worker — V5 (Ultra-Safe Network-First Strategy)
const CACHE_NAME = 'sps-v5';

// Minimal list of critical static assets (DO NOT cache HTML routes)
const ASSETS_TO_CACHE = [
  '/icons/icon-192x192.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE).catch(() => console.warn('SW Install: partial asset cache failure')))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // NEVER intercept API, auth, Next.js internal calls, or navigation requests.
  // We let the browser handle HTML caching/navigation natively to avoid redirect loops.
  if (
    url.pathname.startsWith('/api/') || 
    url.pathname.includes('auth') || 
    url.pathname.includes('_next') ||
    event.request.mode === 'navigate'
  ) {
    return;
  }

  // Network-first for static assets
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Cache successful generic static GET responses
        if (res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request).then(m => m || new Response('', { status: 404 })))
  );
});

// ─── SPRINT 3: KEEPALIVE LISTENER ───
// This keeps the SW active and prevents iOS/Android from killing the browser process
// during long patrol shifts when the app is backgrounded.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'KEEPALIVE') {
    // console.log('[SW] Keepalive heartbeat received');
    // Reply back to client to complete the loop
    event.source.postMessage({ type: 'KEEPALIVE_ACK', timestamp: Date.now() });
  }
});
