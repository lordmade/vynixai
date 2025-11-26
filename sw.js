const CACHE = "vynix-v1";
const assets = [
  "/", "/index.html",
  "https://cdn.tailwindcss.com",
  "https://unpkg.com/lucide@latest/dist/umd/lucide.js",
  "https://cdn.jsdelivr.net/npm/marked/marked.min.js",
  "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(assets)));
});

self.addEventListener("fetch", e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
