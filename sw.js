const CACHE_NAME = 'unimart-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/global.css',
  './css/component.css',
  './css/marketplace.css',
  './css/product.css',
  './css/upload.css',
  './js/config.js',
  './js/supabase.js',
  './js/guard.js',
  './html/marketplace.html',
  './html/login.html',
  './html/upload.html',
  './html/product.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('supabase.co') || e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});