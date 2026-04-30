/* =====================================================
   Service Worker — Calculateur Dalot PWA
   Cache-first, offline-ready
   ===================================================== */

const CACHE_NAME = 'dalot-v1';
const CDN_CACHE  = 'dalot-cdn-v1';

const APP_SHELL = [
  './index.html',
  './manifest.json'
];

const CDN_RESOURCES = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js'
];

/* ---- Install: pre-cache shell ---- */
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)),
      caches.open(CDN_CACHE).then(cache =>
        Promise.allSettled(CDN_RESOURCES.map(url =>
          fetch(url).then(r => r.ok ? cache.put(url, r) : null).catch(() => null)
        ))
      )
    ]).then(() => self.skipWaiting())
  );
});

/* ---- Activate: clean old caches ---- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME && k !== CDN_CACHE)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---- Fetch: cache-first for shell & CDN, network-first otherwise ---- */
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // CDN resources — cache first
  if (CDN_RESOURCES.some(r => url.includes(new URL(r).hostname))) {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CDN_CACHE).then(c => c.put(event.request, clone));
          return response;
        })
      )
    );
    return;
  }

  // App shell — cache first
  if (APP_SHELL.some(p => url.endsWith(p.replace('./', '')))) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // Everything else — network first, fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

/* ---- Background sync placeholder ---- */
self.addEventListener('sync', event => {
  if (event.tag === 'sync-projets') {
    // Future: sync projets to cloud
    event.waitUntil(Promise.resolve());
  }
});
