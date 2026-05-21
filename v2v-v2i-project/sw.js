// ================================================================
//  V2X CONNECT — SERVICE WORKER v1.0
//  
//  Fast Load Strategy:
//  1. NETWORK-FIRST for API calls, live data
//  2. CACHE-FIRST for static assets (CSS, JS, fonts)
//  3. STALE-WHILE-REVALIDATE for HTML (always serve cached first)
//  
//  Cache Invalidation: Change VERSION to force re-cache
// ================================================================

const VERSION = 'v2x-2024-04-10';
const OFFLINE_URL = '/index.html';

// Assets to cache on service worker install
const STATIC_CACHE = [
  '/', '/index.html', '/login.html', '/admin.html', '/control.html',
  '/emergency.html', '/signal.html', '/vehicle1.html', '/vehicle2.html',
  '/user-portal.html',
  '/firebase-config.js', '/intersection-widget.js', '/sw.js',
];

const GOOGLE_FONTS = [
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500;600;700&family=Rajdhani:wght@400;600;700&family=Share+Tech+Mono&display=swap',
];

const FIREBASE_LIBS = [
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
];

// Event: INSTALL — Cache static assets
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(VERSION).then(cache => {
      return Promise.all([
        cache.addAll(STATIC_CACHE),
        cache.addAll(GOOGLE_FONTS),
        cache.addAll(FIREBASE_LIBS),
      ]).catch(() => {
        // Network error during install is OK — continue anyway
      });
    })
  );
});

// Event: ACTIVATE — Clean up old caches
self.addEventListener('activate', e => {
  self.clients.claim();
  e.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names
          .filter(name => name !== VERSION)
          .map(name => {
            console.log('[SW] Cleaning cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
});

// Event: FETCH — Routing strategy
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return e.respondWith(fetch(request));
  }

  // ── Skip chrome extensions, SW, analytics ──
  if (url.protocol === 'chrome-extension:' || 
      url.hostname.includes('analytics') ||
      url.pathname.includes('.map')) {
    return;
  }

  // ── FIREBASE API CALLS — network-first ──
  if (url.hostname.includes('firebaseio.com') || 
      url.hostname.includes('firebase')) {
    return e.respondWith(networkFirst(request, 5000));
  }

  // ── GOOGLE FONTS — cache-first (30 days TTL) ──
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    return e.respondWith(cacheFirst(request, 30 * 24 * 60 * 60 * 1000));
  }

  // ── STATIC JS/CSS — cache-first ──
  if (request.destination === 'script' ||
      request.destination === 'style' ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.woff')) {
    return e.respondWith(cacheFirst(request));
  }

  // ── HTML PAGES — stale-while-revalidate ──
  if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    return e.respondWith(staleWhileRevalidate(request));
  }

  // ── DEFAULT — network-first ──
  return e.respondWith(networkFirst(request, 5000));
});

// ── NETWORK-FIRST: Try network, fallback to cache ──
async function networkFirst(request, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Offline fallback for navigation
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL) || 
             new Response('Offline — please check your connection', { status: 503 });
    }
    throw err;
  }
}

// ── CACHE-FIRST: Use cache, fallback to network ──
async function cacheFirst(request, ttl = 30 * 24 * 60 * 60 * 1000) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      const cachedTime = cached.headers.get('sw-fetch-time');
      if (!cachedTime || Date.now() - parseInt(cachedTime) < ttl) {
        return cached;
      }
    }

    const response = await fetch(request);
    if (response.ok) {
      const c = response.clone();
      const cache = await caches.open(VERSION);
      const headers = new Headers(c.headers);
      headers.set('sw-fetch-time', Date.now());
      const respWithTime = new Response(c.body, { headers, status: c.status });
      cache.put(request, respWithTime);
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// ── STALE-WHILE-REVALIDATE: Serve cached, update in background ──
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  // Return cached immediately
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      const cache = caches.open(VERSION);
      cache.then(c => c.put(request, response.clone()));
    }
    return response;
  }).catch(() => cached || new Response('Offline', { status: 503 }));

  return cached || fetchPromise;
}

// ── MESSAGE HANDLER: Allow clients to skip waiting ──
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] V2X Service Worker v1.0 installed');
