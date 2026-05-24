// ================================================================
//  Syntrix V2X — SERVICE WORKER v2.0
//
//  Fast Load Strategy:
//  1. NETWORK-FIRST for Firebase API calls and live data
//  2. CACHE-FIRST for static JS/CSS/fonts
//  3. STALE-WHILE-REVALIDATE for HTML pages
//
//  Root URL ( / ) redirects to /login via firebase.json rewrite.
//  Offline fallback → /login
// ================================================================

const VERSION     = 'syntrix-v2x-v2.2';
const OFFLINE_URL = '/login';

// Clean URL paths (Firebase cleanUrls: true strips .html)
const STATIC_CACHE = [
  '/', '/login', '/control', '/emergency',
  '/signal', '/vehicle1', '/vehicle2',
  '/user-portal', '/admin-preview', '/404',
  '/firebase-config.js', '/intersection-widget.js',
  '/gps-tracking.js', '/gps-dashboard.js', '/map-config.js',
  '/ai-chat.js', '/favicon.svg',
];

const FIREBASE_LIBS = [
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
];

const GOOGLE_FONTS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap',
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(VERSION).then(cache =>
      Promise.all([
        cache.addAll(STATIC_CACHE).catch(() => {}),
        cache.addAll(FIREBASE_LIBS).catch(() => {}),
        cache.addAll(GOOGLE_FONTS).catch(() => {}),
      ])
    )
  );
});

// ── ACTIVATE — Delete old caches ─────────────────────────────
self.addEventListener('activate', e => {
  self.clients.claim();
  e.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(n => n !== VERSION).map(n => {
          console.log('[SW] Deleting old cache:', n);
          return caches.delete(n);
        })
      )
    )
  );
});

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Only intercept GET
  if (request.method !== 'GET') return;

  // Skip non-http(s)
  if (!url.protocol.startsWith('http')) return;

  // Skip dev tools, source maps
  if (url.pathname.includes('.map') ||
      url.pathname.includes('__webpack')) return;

  // Firebase Realtime DB / Auth — ALWAYS network
  if (url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('googleapis.com/identitytoolkit') ||
      url.hostname.includes('securetoken.googleapis.com')) {
    return e.respondWith(fetch(request).catch(() =>
      new Response('{"offline":true}', { status: 503, headers: { 'Content-Type': 'application/json' } })
    ));
  }

  // Firebase hosting JS — network first with cache fallback
  if (url.hostname.includes('gstatic.com') ||
      url.hostname.includes('firebaseapp.com')) {
    return e.respondWith(networkFirst(request, 8000));
  }

  // Google Fonts — cache first (7 days)
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    return e.respondWith(cacheFirst(request, 7 * 24 * 60 * 60 * 1000));
  }

  // Local static JS/CSS/images — cache first (24h)
  if (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'image' ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.woff')) {
    return e.respondWith(cacheFirst(request, 24 * 60 * 60 * 1000));
  }

  // HTML / Navigation — stale-while-revalidate
  if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    return e.respondWith(staleWhileRevalidate(request));
  }

  // Default — network first
  return e.respondWith(networkFirst(request, 5000));
});

// ── NETWORK-FIRST ─────────────────────────────────────────────
async function networkFirst(request, timeout = 5000) {
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeout);
    const resp = await fetch(request, { signal: ctrl.signal });
    clearTimeout(tid);
    if (resp.ok) {
      const cache = await caches.open(VERSION);
      cache.put(request, resp.clone());
    }
    return resp;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const fallback = await caches.match(OFFLINE_URL);
      return fallback || new Response(
        `<!DOCTYPE html><html><body style="background:#0d1518;color:#dbe4e8;font-family:monospace;padding:40px;text-align:center">
        <h2 style="color:#00e383">⊞ Syntrix — Offline</h2>
        <p style="color:#849586;margin-top:12px">Check your internet connection.</p>
        <a href="/login" style="color:#00e0ff">Return to Login</a>
        </body></html>`,
        { status: 503, headers: { 'Content-Type': 'text/html' } }
      );
    }
    throw new Error('Network failed');
  }
}

// ── CACHE-FIRST ───────────────────────────────────────────────
async function cacheFirst(request, ttl = 7 * 24 * 60 * 60 * 1000) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      const fetchTime = cached.headers.get('sw-cached-at');
      if (!fetchTime || Date.now() - parseInt(fetchTime) < ttl) return cached;
    }
    const resp = await fetch(request);
    if (resp.ok) {
      const headers = new Headers(resp.headers);
      headers.set('sw-cached-at', Date.now().toString());
      const cached = new Response(await resp.clone().arrayBuffer(), { headers, status: resp.status });
      const cache = await caches.open(VERSION);
      cache.put(request, cached);
    }
    return resp;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// ── STALE-WHILE-REVALIDATE ────────────────────────────────────
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then(resp => {
    if (resp.ok) caches.open(VERSION).then(c => c.put(request, resp.clone()));
    return resp;
  }).catch(() => cached || new Response('Offline', { status: 503 }));
  return cached || fetchPromise;
}

// ── MESSAGE: SKIP_WAITING ─────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(names => names.forEach(n => caches.delete(n)));
  }
});

console.log('[SW] Syntrix V2X Service Worker v2.0 installed');
