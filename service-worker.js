const CACHE_NAME = 'yield-matrix-cache-v6';
const OFFLINE_URL = 'offline.html';

const ASSETS_TO_CACHE = [
    '/',
    'index.html',
    'manifest.json',
    'icons/icon-192x192.png',
    'icons/icon-512x512.png',
    'pages/chatbot.html',
    'pages/crop-health.html',
    'pages/crop-recommend.html',
    'pages/disease.html',
    'pages/forum.html',
    'pages/guide.html',
    'pages/irrigation.html',
    'pages/market.html',
    'pages/notifications.html',
    'pages/schemes.html',
    'pages/threat-alerts.html',
    'pages/tril.html',
    'pages/weather.html',
    'offline.html',
    'css/style.css',
    'js/common.js',
    'js/config.js',
    'js/i18n.js',
    'js/notifications.js',
    'js/tril_weather.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => Promise.all(
            cacheNames.map(name => {
                if (name !== CACHE_NAME) {
                    return caches.delete(name);
                }
                return null;
            })
        ))
        .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') {
        return;
    }

    const requestUrl = new URL(event.request.url);

    // Always use offline fallback for navigation requests when offline.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                })
                .catch(() => caches.match(OFFLINE_URL))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then(networkResponse => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const clonedResponse = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, clonedResponse);
                });
                return networkResponse;
            }).catch(() => {
                if (event.request.destination === 'document') {
                    return caches.match(OFFLINE_URL);
                }
            });
        })
    );
});
