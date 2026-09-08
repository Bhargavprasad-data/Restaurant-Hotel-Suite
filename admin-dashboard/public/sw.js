const CACHE_NAME = 'tasty-suites-admin-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/icon.png',
  '/icon_512.png',
  '/icon_192.png',
  '/manifest.json'
];

// Install Event: Cache initial static shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Initial caching skipped:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: Cleanup outdated caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Message Event: Allow web app to force skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 1. Only intercept GET requests (Cache API only supports GET; POST/PUT/DELETE bypass SW)
  if (req.method !== 'GET') {
    return;
  }

  // 2. Only handle HTTP and HTTPS requests (ignore chrome-extension://, etc.)
  if (!req.url.startsWith('http://') && !req.url.startsWith('https://')) {
    return;
  }

  const url = new URL(req.url);

  // 3. Do not intercept backend API calls or cross-origin requests (except Google Fonts)
  // Let them go directly to network so app error handling works natively
  if (
    url.pathname.startsWith('/api') ||
    (url.origin !== self.location.origin &&
      !url.hostname.includes('fonts.googleapis.com') &&
      !url.hostname.includes('fonts.gstatic.com'))
  ) {
    return;
  }

  // 4. Handle SPA navigation requests
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/index.html', responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedIndex = await caches.match('/index.html') || await caches.match('/');
          if (cachedIndex) {
            return cachedIndex;
          }

          return new Response(
            '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Offline</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:sans-serif;text-align:center;padding:40px;"><h2>You are offline</h2><p>Please check your internet connection and reload the app.</p><button onclick="location.reload()" style="padding:10px 20px;font-size:16px;cursor:pointer;">Reload</button></body></html>',
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            }
          );
        })
    );
    return;
  }

  // 5. Handle static assets (JS chunks, CSS, images, icons, fonts)
  // Cache First with Network Fallback and dynamic caching
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(req)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (networkResponse.type === 'basic' || networkResponse.type === 'cors')
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const fallback = await caches.match(req);
          if (fallback) {
            return fallback;
          }

          return new Response('Resource unavailable offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        });
    })
  );
});
