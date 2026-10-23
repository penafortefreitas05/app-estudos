// ============================================================
// service-worker.js - Gerenciador de Cache e Offline (FocoPro)
// ============================================================

const CACHE_NAME = 'focopro-v4';

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

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(RECURSOS_ESTATICOS);
        }).then(() => self.skipWaiting())
    );
});

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

// Estratégia Network-First: garante código sempre atualizado no desenvolvimento e 100% funcional offline
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return; 
    }
    const url = new URL(event.request.url);
    if (!url.protocol.startsWith('http')) return;

    event.respondWith(
        fetch(event.request)
            .then((respostaRede) => {
                if (respostaRede && respostaRede.status === 200) {
                    const respostaClonada = respostaRede.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respostaClonada));
                }
                return respostaRede;
            })
            .catch(() => caches.match(event.request))
    );
});