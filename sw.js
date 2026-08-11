/* ══════════════════════════════════════════════════════
   Placas · Rua — service worker
   VERSÃO v4 · 11 de agosto de 2026

   COMO ATUALIZAR NO FUTURO:
   muda só a linha VERSAO aqui em baixo. Mais nada.
   ══════════════════════════════════════════════════════ */

const VERSAO = 'v4-2026-08-11';
const CACHE  = 'placas-' + VERSAO;

const ESSENCIAIS = [
  './',
  './index.html'
];

/* ── instalar ──
   Guarda o essencial e entra em serviço já, sem esperar
   que feches todos os separadores. */
self.addEventListener('install', evento => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // um a um, para que um ficheiro em falta não estrague a instalação toda
    await Promise.all(
      ESSENCIAIS.map(url => cache.add(url).catch(() => {}))
    );
    await self.skipWaiting();
  })());
});

/* ── ativar ──
   Apaga as caches das versões antigas e assume o controlo
   dos separadores já abertos. */
self.addEventListener('activate', evento => {
  evento.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(
      nomes
        .filter(n => n.startsWith('placas-') && n !== CACHE)
        .map(n => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

/* ── pedidos ── */
self.addEventListener('fetch', evento => {
  const pedido = evento.request;

  if (pedido.method !== 'GET') return;

  const url = new URL(pedido.url);
  const mesmaOrigem = url.origin === self.location.origin;

  /* A PÁGINA: rede primeiro.
     É isto que faz com que uma versão nova apareça no telemóvel
     mal a publiques. Sem rede, serve o que está guardado. */
  if (pedido.mode === 'navigate' ||
      (mesmaOrigem && url.pathname.endsWith('.html'))) {
    evento.respondWith((async () => {
      try {
        const resposta = await fetch(pedido, { cache: 'no-store' });
        const cache = await caches.open(CACHE);
        cache.put('./index.html', resposta.clone());
        return resposta;
      } catch (_) {
        const cache = await caches.open(CACHE);
        return (await cache.match(pedido)) ||
               (await cache.match('./index.html')) ||
               Response.error();
      }
    })());
    return;
  }

  /* RESTO DO SITE: serve o guardado e atualiza por trás. */
  if (mesmaOrigem) {
    evento.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const guardado = await cache.match(pedido);
      const daRede = fetch(pedido)
        .then(r => { if (r && r.ok) cache.put(pedido, r.clone()); return r; })
        .catch(() => null);
      return guardado || (await daRede) || Response.error();
    })());
    return;
  }

  /* LEAFLET E OUTROS CDN: guardado primeiro, para o mapa
     funcionar com rede fraca. */
  evento.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const guardado = await cache.match(pedido);
    if (guardado) return guardado;
    try {
      const resposta = await fetch(pedido);
      if (resposta && (resposta.ok || resposta.type === 'opaque')) {
        cache.put(pedido, resposta.clone());
      }
      return resposta;
    } catch (_) {
      return Response.error();
    }
  })());
});

/* ── permite forçar a atualização a partir da página ── */
self.addEventListener('message', evento => {
  if (evento.data === 'atualizar-ja') self.skipWaiting();
});
