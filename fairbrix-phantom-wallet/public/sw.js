self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open('fbrx-cache-v1');
    await cache.addAll(['/','/manifest.json','/icons/logo.svg']);
  })());
  // Activate the new SW immediately
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  try {
    const url = new URL(e.request.url);
    // Never intercept API or non-GET requests; let network handle them.
    if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  } catch {}
  e.respondWith((async () => {
    try {
      const res = await fetch(e.request);
      return res;
    } catch (err) {
      const cache = await caches.open('fbrx-cache-v1');
      const cached = await cache.match(e.request);
      return cached || Response.error();
    }
  })());
});
