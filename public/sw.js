// Service worker: lets the app open with no internet.
// - /_next/static files (scripts, styles) never change for a given URL: cache-first.
// - Pages: network-first, falling back to the last copy we saved.
// On install it also pre-downloads every page and the scripts they need, so
// ALL screens work offline after a single online visit.
const CACHE = 'shop-manager-v1';
const PAGES = ['/', '/login', '/billing', '/inventory', '/sales', '/reports', '/change-password'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const page of PAGES) {
      try {
        const res = await fetch(page, { credentials: 'same-origin' });
        if (!res.ok) continue;
        const html = await res.clone().text();
        await cache.put(page, res);
        const assets = new Set(html.match(/\/_next\/static\/[^"'\s\\)]+/g) || []);
        await Promise.all([...assets].map(async (url) => {
          if (await cache.match(url)) return;
          try { const r = await fetch(url); if (r.ok) await cache.put(url, r); } catch (e) {}
        }));
      } catch (e) { /* offline during install: ignore, will cache on normal visits */ }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // Firebase calls etc. go straight through

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (e) {
      const hit = await cache.match(req, { ignoreSearch: false });
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const page = await cache.match(url.pathname) || await cache.match('/');
        if (page) return page;
      }
      throw e;
    }
  })());
});
