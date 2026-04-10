const CACHE = 'alchoscan-v3';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './products.js',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './icon.svg'
];

// Install — precache all core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate — clear old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Core app files: cache first
// - Open Food Facts API: network first, no cache (live data)
// - Google Fonts: cache first
// - Everything else: network first, fall back to cache
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never cache OFF API calls
  if (url.hostname === 'world.openfoodfacts.org') {
    e.respondWith(fetch(e.request).catch(() =>
      new Response(JSON.stringify({ status: 0 }), {
        headers: { 'Content-Type': 'application/json' }
      })
    ));
    return;
  }

  // Cache first for same-origin assets and Google Fonts
  if (url.origin === self.location.origin || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network first for everything else
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
