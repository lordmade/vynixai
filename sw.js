self.addEventListener('install', e => {
  e.waitUntil(caches.open('studybuddy-v1').then(cache => {
    return cache.addAll(['/']);
  }));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
