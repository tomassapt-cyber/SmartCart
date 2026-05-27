/**
 * GirlMath service worker — PASS-THROUGH (no caching).
 *
 * Decisão: o caching agressivo do SW estava a causar problemas — utilizadores
 * ficavam presos em versões antigas após deploys. Como ainda não temos uma
 * estratégia de offline robusta, o SW agora limita-se a:
 *   1. Apagar TODAS as caches antigas no activate (limpa estado herdado)
 *   2. Skip-waiting e claim para activar imediatamente
 *   3. Não interceptar fetch — browser usa HTTP cache normal, respeita headers
 *
 * Resultado: cada deploy é visível após simples F5, sem o SW a interpor-se.
 * Se voltarmos a precisar de offline, fazemos uma versão nova com estratégia.
 */
const SW_VERSION = 'gm-passthrough-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Sem fetch handler intencionalmente — o browser trata de tudo nativamente.
