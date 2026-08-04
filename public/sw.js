/* Africa Insight PWA - keep SW install fast and never block on cache. */
const CACHE = "africa-insight-shell-v2";

self.addEventListener("install", (event) => {
  // Must resolve quickly or Chrome install UI hangs.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// Required for installability: a fetch handler must exist.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Network-first for everything - news must stay fresh.
  // Pass-through keeps the SW "active" without offline HTML caching.
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
