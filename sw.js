const CACHE_NAME = 'vynix-lingua-cache-v3';
const ICON_URL   = 'https://i.postimg.cc/XJ0PKgRx/Screenshot-20260407-010610-removebg-preview.png';

const PRECACHE = [
  '/',
  '/index.html',
  '/home.html',
  '/manifest.json',
  ICON_URL,
];

// ── INSTALL: precache core assets & activate immediately ──────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()) // don't wait for old SW to die
  );
});

// ── ACTIVATE: purge stale caches & claim all clients ─────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => k !== CACHE_NAME)
            .map(k => {
              console.log('[SW] Deleting old cache:', k);
              return caches.delete(k);
            })
        )
      )
      .then(() => self.clients.claim()) // take control of open tabs now
  );
});

// ── FETCH ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Remote icon → cache-first with network fallback + cache update
  if (request.url === ICON_URL) {
    event.respondWith(cacheFirstWithUpdate(request));
    return;
  }

  // Cross-origin (fonts, CDN, APIs) → network only, no caching
  if (url.origin !== self.location.origin) return;

  // HTML pages → network-first so users always get fresh content,
  // fall back to cache when offline
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithCacheFallback(request));
    return;
  }

  // Everything else (JS, CSS, images, JSON) → cache-first,
  // update cache in the background after serving
  event.respondWith(cacheFirstWithUpdate(request));
});

// ── STRATEGIES ───────────────────────────────────────────────────────────

/**
 * Cache-first: serve from cache immediately if available,
 * then fetch from network in the background and refresh the cache entry.
 * Falls back to network if not in cache at all.
 */
async function cacheFirstWithUpdate(request) {
  const cache    = await caches.open(CACHE_NAME);
  const cached   = await cache.match(request);

  // Kick off a background refresh regardless
  const networkFetch = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  // Return cached version instantly, or wait for network if nothing cached
  return cached ?? (await networkFetch) ?? new Response('Offline', { status: 503 });
}

/**
 * Network-first: try the network, cache the response, fall back to cache.
 * Best for HTML so users get fresh markup while still working offline.
 */
async function networkFirstWithCacheFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached ?? new Response('<h1>You are offline</h1>', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
