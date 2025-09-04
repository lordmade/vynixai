// Versioning for cache to ensure updates are applied
const CACHE_NAME = 'app-cache-v1';
const MENU_CACHE_NAME = 'menu-cache-v1';

// Assets to cache for offline support
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/restaurants.html',
  'https://cdn.tailwindcss.com',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js',
  'https://via.placeholder.com/600x300?text=Restaurant', // Fallback banner image
  'https://via.placeholder.com/100x100?text=Menu+Item' // Fallback menu image
];

// Install event: Cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).catch(error => {
      console.error('Service Worker: Cache installation failed:', error);
    })
  );
  // Activate immediately after installation
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME && cache !== MENU_CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients');
      return self.clients.claim();
    }).catch(error => {
      console.error('Service Worker: Activation failed:', error);
    })
  );
});

// Fetch event: Serve cached content or fetch from network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Handle menu data requests
  if (url.pathname === '/menu-data') {
    event.respondWith(
      caches.open(MENU_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          if (response) {
            console.log('Service Worker: Serving cached menu data');
            return response;
          }
          // If not cached, attempt to fetch and cache
          return fetch(event.request).then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            caches.open(MENU_CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
              console.log('Service Worker: Cached menu data');
            });
            return networkResponse;
          }).catch(() => {
            console.warn('Service Worker: Failed to fetch menu data');
            return caches.match(event.request);
          });
        });
      })
    );
    return;
  }

  // Handle static assets
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        console.log('Service Worker: Serving cached asset:', event.request.url);
        return response;
      }
      console.log('Service Worker: Fetching from network:', event.request.url);
      return fetch(event.request).then(networkResponse => {
        // Cache new assets dynamically
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
          console.log('Service Worker: Cached new asset:', event.request.url);
        });
        return networkResponse;
      }).catch(error => {
        console.error('Service Worker: Fetch failed:', error);
        // Return fallback image for failed image requests
        if (event.request.destination === 'image') {
          return caches.match('https://via.placeholder.com/100x100?text=Menu+Item');
        }
        // Return offline page or fallback for HTML
        if (event.request.mode === 'navigate') {
          return caches.match('/restaurants.html');
        }
        throw error;
      });
    })
  );
});

// Handle push notifications (optional, for future expansion)
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'My Two Minutes Food', body: 'New offers available!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.png', // Replace with your app icon
      badge: '/badge.png' // Replace with your badge icon
    })
  );
});

// Handle notification clicks (optional, for future expansion)
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/restaurants.html') // Redirect to restaurants page
  );
});
