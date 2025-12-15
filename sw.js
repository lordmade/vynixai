const CACHE_NAME = 'vynix-lingua-cache-v2';
const ICON_URL = 'https://i.postimg.cc/vT9VSrhF/Gemini-Generated-Image-uj8nvtuj8nvtuj8n.png';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  // Include the remote icon URL here so it's cached for offline use
  ICON_URL 
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
  // Always try to serve the icon from the cache first
  if (event.request.url === ICON_URL) {
      event.respondWith(caches.match(event.request));
      return;
  }
  
  // Skip cross-origin requests like Google Fonts for basic caching
  if (!event.request.url.startsWith(self.location.origin)) {
     return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found, else fetch from network
      return response || fetch(event.request).then(networkResponse => {
         return networkResponse;
      });
    })
  );
});
