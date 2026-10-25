// ============================================================
// service-worker.js - Cache dos arquivos do app (FocoPro)
// ============================================================
// Regra de segurança: só arquivos do PRÓPRIO site entram no cache.
// Respostas da API do Supabase (questões, histórico, login) nunca são guardadas:
// antes, o banco inteiro e o histórico ficavam no cache do navegador mesmo após o logout.
// Ao mudar a lista abaixo ou publicar uma versão nova, suba o número do CACHE_NAME.

const CACHE_NAME = 'focopro-v10';

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
    './js/api.js',
    './js/auth.js',
    './js/supabase.js',
    './js/pwa.js',
    './js/revisao.js',
    './js/vendor/supabase-js-2.117.3.min.js',
    './icons/android-chrome-192x192.png',
    './icons/android-chrome-512x512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(RECURSOS_ESTATICOS))
            .then(() => self.skipWaiting())
    );
});

// Apaga os caches de versões anteriores (inclusive o focopro-v4, que tinha dados da API)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((chaves) => Promise.all(
                chaves.filter((chave) => chave !== CACHE_NAME).map((chave) => caches.delete(chave))
            ))
            .then(() => self.clients.claim())
    );
});

// Network-first SÓ para arquivos do próprio site; todo o resto passa direto, sem cache.
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return; // Supabase, fontes do Google etc.: não interceptar

    event.respondWith(
        fetch(req)
            .then((respostaRede) => {
                if (respostaRede && respostaRede.status === 200 && respostaRede.type === 'basic') {
                    const copia = respostaRede.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
                }
                return respostaRede;
            })
            .catch(() => caches.match(req))
    );
});
