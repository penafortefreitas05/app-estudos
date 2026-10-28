// ============================================================
// service-worker.js - Cache dos arquivos do app (FocoPro)
// ============================================================
// Regra de segurança: só arquivos do PRÓPRIO site entram no cache.
// Respostas da API do Supabase (questões, histórico, login) nunca são guardadas:
// antes, o banco inteiro e o histórico ficavam no cache do navegador mesmo após o logout.
//
// Como as atualizações chegam (item 16b do roadmap):
//   - O app abre direto do cache (instantâneo, funciona sem internet).
//   - O navegador confere este arquivo a cada abertura. Se o CACHE_NAME mudou, a versão nova
//     baixa TODOS os arquivos de uma vez em segundo plano e o app mostra "Nova versão disponível".
//   - Tocar em "Atualizar" (ou fechar e abrir o app) troca para a versão nova inteira.
// POR ISSO: a cada publicação que muda qualquer arquivo do site, suba o número do CACHE_NAME.
// Sem isso, quem já tem o app continua na versão antiga.

const CACHE_NAME = 'focopro-v37';

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
    './js/primeiros-passos.js',
    './js/aprender.js',
    './js/laboratorio-sql.js',
    // O motor do laboratório SQL (js/vendor/sqljs-*) NÃO entra aqui: ~650 KB que só quem usa
    // baixa. Na primeira abertura ele vai para o cache sozinho (regra do fetch abaixo).
    './js/vendor/supabase-js-2.117.3.min.js',
    './icons/android-chrome-192x192.png',
    './icons/android-chrome-512x512.png'
];

self.addEventListener('install', (event) => {
    // cache: 'reload' = busca no servidor, ignorando o cache HTTP do navegador
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(RECURSOS_ESTATICOS.map((url) => new Request(url, { cache: 'reload' }))))
    );
    // Sem skipWaiting aqui: a versão nova espera o "Atualizar" (ou o app ser fechado),
    // para não trocar os arquivos no meio de um simulado.
});

// O botão "Atualizar" do aviso de versão nova manda esta mensagem
self.addEventListener('message', (event) => {
    if (event.data && event.data.tipo === 'ativar-versao-nova') self.skipWaiting();
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

// Arquivos do próprio site: primeiro o cache (abre na hora), rede só se não estiver lá.
// Todo o resto (Supabase, fontes externas) passa direto, sem cache.
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    // Abrir o app (qualquer endereço do site) = a página principal guardada
    const ehNavegacao = req.mode === 'navigate';

    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const guardada = ehNavegacao
                ? (await cache.match('./index.html')) || (await cache.match('./'))
                : await cache.match(req, { ignoreSearch: true });
            if (guardada) return guardada;

            const respostaRede = await fetch(req);
            if (respostaRede && respostaRede.status === 200 && respostaRede.type === 'basic') {
                cache.put(req, respostaRede.clone());
            }
            return respostaRede;
        })
    );
});