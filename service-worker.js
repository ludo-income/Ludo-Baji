/* Ludo Baji Service Worker - v8 stable */
const CACHE_NAME = 'ludo-baji-v8-stable-123';
const PRECACHE = [
  '/manifest.webmanifest',
  '/admin-manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/7543.jpg',
  '/logo-ludo-baji.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // API → always network
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // HTML + JS + CSS → network-first (so updates apply immediately)
  const path = url.pathname;
  const isHTML = path === '/' || path.endsWith('.html') || path === '/admin' || path === '/admin/';
  const isCode = path.endsWith('.js') || path.endsWith('.css');
  if (isHTML || isCode) {
    event.respondWith(
      fetch(req).then((res) => {
        // do NOT put JS/CSS into long cache — always prefer network
        if (isHTML && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req).then((c) => c || (isHTML ? caches.match('/') : undefined)))
    );
    return;
  }

  // Images / static → cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
    })
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'Ludo Baji', message: 'নতুন notification', data: {} };
  try { data = event.data ? event.data.json() : data; } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Ludo Baji', {
      body: data.message || '',
      icon: '/7543.jpg',
      badge: '/7543.jpg',
      data: data.data || {},
      tag: 'ludo-baji'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      for (const c of cs) { if ('focus' in c) return c.focus(); }
      return clients.openWindow('/');
    })
  );
});
