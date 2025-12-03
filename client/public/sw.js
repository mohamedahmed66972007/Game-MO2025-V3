const CACHE_NAME = 'guess-game-v3';
const STATIC_CACHE = 'guess-game-static-v3';
const DYNAMIC_CACHE = 'guess-game-dynamic-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/sounds/background.mp3',
  '/sounds/hit.mp3',
  '/sounds/success.mp3',
  '/textures/asphalt.png',
  '/textures/grass.png',
  '/textures/sand.jpg',
  '/textures/sky.png',
  '/textures/wood.jpg',
  '/fonts/inter.json',
  '/geometries/heart.gltf'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS.map(url => {
        return new Request(url, { cache: 'reload' });
      })).catch(err => {
        console.log('[SW] Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/game')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        if (request.destination === 'document') {
          return caches.match('/');
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
