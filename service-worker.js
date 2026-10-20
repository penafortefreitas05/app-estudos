// ============================================================
// service-worker.js - Gerenciador de Cache e Offline (FocoPro)
// ============================================================

const CACHE_NAME = 'focopro-v1';

// ---------- 1. RECURSOS DO APP SHELL PARA CACHE INICIAL ----------
const RECURSOS_ESTATICOS = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/app.js',
    './js/ui.js',
    './js/simulado.js',
    './js/storage.js',
    './js/notifications.js',
    './js/api.js'
];

// ---------- 2. EVENTO DE INSTALAÇÃO (PRE-CACHING) ----------
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(RECURSOS_ESTATICOS);
        }).then(() => self.skipWaiting())
    );
});

// ---------- 3. EVENTO DE ATIVAÇÃO (LIMPEZA DE CACHES ANTIGOS) ----------
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((chaves) => {
            return Promise.all(
                chaves.map((chave) => {
                    if (chave !== CACHE_NAME) {
                        return caches.delete(chave);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// ---------- 4. ESTRATÉGIA DE INTERCEPTAÇÃO DE REQUISIÇÕES ----------
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Ignora requisições de extensões do Chrome ou esquemas não-HTTP
    if (!url.protocol.startsWith('http')) return;

    // Estratégia Network-First para requisições de dados JSON (Banco de Questões)
    if (url.pathname.endsWith('.json') && !url.pathname.endsWith('manifest.json')) {
        event.respondWith(
            fetch(event.request)
                .then((respostaRede) => {
                    if (respostaRede.ok) {
                        const respostaClonada = respostaRede.clone(); // Clone síncrono
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respostaClonada));
                    }
                    return respostaRede;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Estratégia Stale-While-Revalidate para o App Shell e assets estáticos
    event.respondWith(
        caches.match(event.request).then((respostaCache) => {
            const buscarNaRede = fetch(event.request).then((respostaRede) => {
                if (respostaRede && respostaRede.status === 200) {
                    const respostaClonada = respostaRede.clone(); // Clone síncrono antes do retorno
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respostaClonada));
                }
                return respostaRede;
            }).catch(() => {
                // Silencia falhas de conexão quando estiver 100% offline
            });

            return respostaCache || buscarNaRede;
        })
    );
});