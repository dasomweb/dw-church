/* Minimal storefront service worker.
 * Goal: make tenant sites installable as a PWA without changing behavior.
 * Strategy: network-first; only cache navigations and fall back to the cache
 * (or a cached navigation) when offline. Never breaks the page. */

const CACHE = 'dw-church-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GETs; let everything else pass through untouched.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first. On success, cache navigations for offline fallback.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (request.mode === 'navigate' && response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const fallback = await caches.match(request, { ignoreSearch: true });
          if (fallback) return fallback;
        }
        return Response.error();
      }),
  );
});
