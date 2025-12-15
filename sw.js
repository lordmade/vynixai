const CACHE_NAME = 'vynix-lingua-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  // Add other local assets here if you have external CSS/JS files
  // Do not cache the Google Fonts URLs directly here, let the browser handle those.
];

// Install event: Cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event: Cache-first strategy
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests like Google Fonts for basic caching
  if (!event.request.url.startsWith(self.location.origin)) {
     return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found, else fetch from network
      return response || fetch(event.request).then(networkResponse => {
         // Optionally cache new requests dynamically here
         return networkResponse;
      });
    })
  );
});
