// TaskTrack Service Worker — Caches app shell for offline access
const CACHE_NAME = 'tasktrack-v1';

const APP_SHELL = [
    '/',
    '/index.html',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
];

// Install — cache the app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching app shell');
            return cache.addAll(APP_SHELL);
        })
    );
    self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Fetch — network-first strategy for navigation, cache-first for assets
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Skip non-GET and cross-origin requests
    if (request.method !== 'GET') return;

    // For navigation requests (HTML pages) — network first, fallback to cache
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache the latest version
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return response;
                })
                .catch(() => caches.match('/index.html'))
        );
        return;
    }

    // For assets (JS, CSS, images) — cache first, network fallback
    if (
        request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'image' ||
        request.destination === 'font'
    ) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    // Only cache same-origin responses
                    if (response.ok && request.url.startsWith(self.location.origin)) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // For API calls (Gemini/Groq) — always go to network, don't cache
    if (request.url.includes('generativelanguage.googleapis.com') || request.url.includes('api.groq.com')) {
        event.respondWith(fetch(request));
        return;
    }

    // Default — try network, fallback to cache
    event.respondWith(
        fetch(request).catch(() => caches.match(request))
    );
});

// Push notification handler
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};
    const title = data.title || 'TaskTrack';
    const options = {
        body: data.body || 'You have updates in TaskTrack!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        vibrate: [100, 50, 100],
        tag: data.tag || 'tasktrack-push',
        renotify: true,
        data: { url: '/' },
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click — open or focus the app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            if (clients.length > 0) {
                return clients[0].focus();
            }
            return self.clients.openWindow('/');
        })
    );
});
