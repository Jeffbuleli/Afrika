/* Africa Insight — minimal SW so the site is installable as an app. */
const CACHE = "africa-insight-shell-v1";
const PRECACHE = ["/icon-192.png", "/icon-512.png", "/favicon-48.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Only cache static icons — never HTML/API (fresh news).
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/icon") ||
      url.pathname.startsWith("/favicon") ||
      url.pathname.startsWith("/apple-touch"))
  ) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req)),
    );
  }
});
