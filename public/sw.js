// SIGPAD Tactical Service Worker — V6 (Cache-First Map Tiles + Network-First Static + Keepalive)
const CACHE_NAME = 'sigpad-static-v6';
const TILE_CACHE_NAME = 'sigpad-map-tiles-v1';
const MAX_TILE_ENTRIES = 5000;

// Minimal list of critical static assets
const ASSETS_TO_CACHE = [
  '/icons/icon-192x192.png',
  '/icons/apple-touch-icon.png',
  '/Logo SIGPAD.png'
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
      keys.filter(k => k !== CACHE_NAME && k !== TILE_CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Helper: Trim tile cache if it exceeds MAX_TILE_ENTRIES
async function trimTileCache() {
  try {
    const cache = await caches.open(TILE_CACHE_NAME);
    const keys = await cache.keys();
    if (keys.length > MAX_TILE_ENTRIES) {
      const keysToDelete = keys.slice(0, keys.length - MAX_TILE_ENTRIES);
      await Promise.all(keysToDelete.map(k => cache.delete(k)));
    }
  } catch (e) {}
}

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);

  // 1. TACTICAL BLUEPRINT REQUIREMENT: Map Tile Interception (Cache-First)
  // Intercept map tiles from Mapbox, OpenStreetMap, CartoDB, Thunderforest, Stamen
  const isMapTile = (
    url.hostname.includes('mapbox.com') ||
    url.hostname.includes('openstreetmap.org') ||
    url.hostname.includes('basemaps.cartocdn.com') ||
    url.hostname.includes('thunderforest.com') ||
    url.pathname.includes('/tiles/') ||
    url.pathname.endsWith('.pbf') ||
    url.pathname.endsWith('.mvt')
  ) && (
    url.pathname.includes('/v4/') ||
    url.pathname.includes('/styles/') ||
    url.pathname.includes('/tiles/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.pbf') ||
    url.pathname.endsWith('.mvt') ||
    url.hostname.includes('tile')
  );

  if (isMapTile) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          // Serve from local device cache instantly (0 mobile data consumed)
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.status === 200 || networkResponse.type === 'opaque') {
            cache.put(event.request, networkResponse.clone());
            trimTileCache();
          }
          return networkResponse;
        } catch (e) {
          return new Response('', { status: 404 });
        }
      })
    );
    return;
  }
  
  // NEVER intercept API, auth, Next.js internal calls, or navigation requests.
  if (
    url.pathname.startsWith('/api/') || 
    url.pathname.includes('auth') || 
    url.pathname.includes('_next') ||
    event.request.mode === 'navigate'
  ) {
    return;
  }

  // Network-first for generic static assets
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

// ─── KEEPALIVE LISTENER ───
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'KEEPALIVE') {
    event.source.postMessage({ type: 'KEEPALIVE_ACK', timestamp: Date.now() });
  }
});
