/**
 * AI Proctor Examination Platform - Production Service Worker
 * 
 * Deliberate Caching Architecture:
 * 1. Static Assets (/_next/static/, CSS, JS, fonts, icons): CACHE-FIRST (content-hashed, safe indefinitely)
 * 2. Page Navigations (mode === 'navigate'): NETWORK-FIRST -> CACHED PAGE -> /offline.html
 * 3. API Calls & WebSockets (/api/, backend ports, /ws): NETWORK-ONLY (Strictly NEVER cached for exam integrity)
 * 4. Web Push Notification Handlers: Receives exam reminders, displays rich notifications & routes click actions.
 */

const STATIC_CACHE = 'ai-proctor-static-v1';
const PAGES_CACHE = 'ai-proctor-pages-v1';
const OFFLINE_FALLBACK = '/offline.html';

const PRECACHE_ASSETS = [
  OFFLINE_FALLBACK,
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/badge-72.png',
  '/icons/icon.svg'
];

// 1. INSTALL: Pre-cache core shell & offline fallback
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE: Purge obsolete caches and claim existing clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== PAGES_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: Check if request is an API or dynamic backend route
function isApiRequest(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/api/v1/') ||
    url.port === '8000' ||
    url.protocol.startsWith('ws')
  );
}

// Helper: Check if request is a static asset
function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(js|css|woff2|woff|ttf|svg|png|jpg|jpeg|webp|ico)$/)
  );
}

// 3. FETCH: Route-specific caching strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests (e.g. POST, PUT, DELETE) - always pass to network
  if (request.method !== 'GET') {
    return;
  }

  // STRATEGY C: API CALLS -> STRICTLY NETWORK-ONLY
  // Exam correctness requires live, server-authoritative state (timers, answers, proctoring flags).
  if (isApiRequest(url)) {
    event.respondWith(fetch(request));
    return;
  }

  // STRATEGY A: STATIC ASSETS -> CACHE-FIRST
  // Content-hashed assets are safe to serve from cache immediately.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached asset immediately; optionally refresh in background
            fetch(request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse);
              }
            }).catch(() => {});
            return cachedResponse;
          }

          // Not in cache: fetch from network and store
          return fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // STRATEGY B: PAGE NAVIGATIONS -> NETWORK-FIRST WITH OFFLINE FALLBACK
  // Ensures user sees the freshest version when online, falls back to cached page or /offline.html
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(PAGES_CACHE).then((cache) => {
              cache.put(request, copy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed: attempt to match cached copy of the page
          return caches.match(request).then((cachedPage) => {
            if (cachedPage) {
              return cachedPage;
            }
            // If page is not in cache, serve dedicated offline fallback
            return caches.match(OFFLINE_FALLBACK);
          });
        })
    );
    return;
  }

  // Default fallback: Network fetch
  event.respondWith(fetch(request));
});

// 4. PUSH: Handle incoming Web Push notifications (e.g. Exam Starting Soon)
self.addEventListener('push', (event) => {
  let data = {
    title: 'AI Proctor Examination Platform',
    body: 'You have a scheduled examination notification.',
    url: '/',
    tag: 'ai-proctor-notification'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: data.tag || 'exam-reminder',
    renotify: true,
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Open Exam' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 5. NOTIFICATION CLICK: Route user to the destination page on interaction
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const destinationUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open on this origin, focus it and navigate
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          client.focus();
          return client.navigate(destinationUrl);
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(destinationUrl);
      }
    })
  );
});
