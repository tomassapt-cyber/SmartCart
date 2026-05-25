/**
 * GirlMath service worker — cache offline + atualização suave.
 *
 * Estratégia:
 *  • HTML (index/catalogo): network-first com fallback cache → mostras sempre o
 *    catálogo mais recente quando online, e quando offline o último visto.
 *  • Estáticos (fonts, icon, manifest): stale-while-revalidate → arranque
 *    instantâneo do ecrã inicial, atualiza em background.
 *  • Imagens de produtos: cache-first (limite 200 entradas, ~50 MB).
 *
 * Sempre que mexeres no HTML/JS, sobe `CACHE_VERSION` — o sw apaga caches
 * antigas no `activate`.
 */
const CACHE_VERSION = 'gm-v23';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const IMG_CACHE = `${CACHE_VERSION}-img`;
const IMG_MAX_ENTRIES = 200;

const SHELL_URLS = [
  '/',
  '/index.html',
  '/catalogo.html',
  '/icon.svg',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isHTML(req) {
  return req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
}

function isImage(req) {
  return req.destination === 'image';
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const excess = keys.length - maxEntries;
  for (let i = 0; i < excess; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Não interceptar requests cross-origin para Supabase/APIs externas
  if (url.origin !== self.location.origin && !url.hostname.includes('fonts.g')) {
    return;
  }

  if (isHTML(req)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  if (isImage(req)) {
    event.respondWith(
      caches.open(IMG_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) {
          cache.put(req, res.clone());
          trimCache(IMG_CACHE, IMG_MAX_ENTRIES);
        }
        return res;
      })
    );
    return;
  }

  // Stale-while-revalidate para tudo o resto (CSS/JS/fonts)
  event.respondWith(
    caches.open(SHELL_CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const fetching = fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fetching;
    })
  );
});
