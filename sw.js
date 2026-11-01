// ── ScoreKeeper Service Worker ────────────────────────────────
// À placer à la RACINE du dépôt GitHub (même niveau qu'index.html)

const APP_VERSION = 'V20261101 15H00';
const CACHE_PREFIX = 'scorekeeper-';
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}`;
const APP_SHELL = './index.html';

const CORE_ASSETS = [
  './',
  APP_SHELL,
  './sw.js',
];

function isCacheableResponse(response) {
  return response && response.ok;
}

async function putInCurrentCache(request, response) {
  if (!isCacheableResponse(response)) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await putInCurrentCache(APP_SHELL, response);
    }
    return response;
  } catch (error) {
    const fallback = await caches.match(APP_SHELL);
    if (fallback) return fallback;
    throw error;
  }
}

async function cacheFirstLocal(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  await putInCurrentCache(request, response);
  return response;
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames
          .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  event.respondWith(cacheFirstLocal(event.request));
});
