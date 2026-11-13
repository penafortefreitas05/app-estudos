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

const CACHE_NAME = 'focopro-v157';

// Vídeos "Aprenda em 1 min": cache PRÓPRIO, fora do CACHE_NAME. Quem baixa é a página (botão "Baixar para ver
// sem internet"); aqui o service worker só (1) preserva esse cache nas atualizações e (2) serve os vídeos
// baixados com suporte a Range (o Chrome do Android pede o vídeo por faixas e precisa de resposta 206).
const PREFIXO_VIDEOS = 'focopro-videos';
const CACHE_VIDEOS = 'focopro-videos-v1';

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
    './js/video-aprenda.js',
    './data/videos.json',
    './js/registro-abertura.js',
    './js/revisao.js',
    './js/primeiros-passos.js',
    './js/aprender-tela.js',
    './js/meu-dia.js',
    './js/conta.js',
    './js/leitura.js',
    './js/seletor-assunto.js',
    './js/filtros-tela.js',
    './js/caderno-erros.js',
    './js/icones.js',
  './js/plano.js',
  './js/prioridade.js',
  './js/ordem-assuntos.js',
  './js/simulado-tela.js',
  './js/offline-pacote.js',
  './js/modelo-prova.js',
    './data/resumos-assunto.json',
    './data/aprender-cartoes.json',
    './js/laboratorio-sql.js',
    // O motor do laboratório SQL (js/vendor/sqljs-*) NÃO entra aqui: ~650 KB que só quem usa
    // baixa. Na primeira abertura ele vai para o cache sozinho (regra do fetch abaixo).
    './js/vendor/supabase-js-2.117.3.min.js',
    './icons/android-chrome-192x192.png',
    './icons/android-chrome-512x512.png',
    './icons/maskable-512x512.png',
    './icons/apple-touch-icon.png'
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

// Apaga os caches de versões anteriores (inclusive o focopro-v4, que tinha dados da API), MENOS os de vídeos baixados
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((chaves) => Promise.all(
                chaves.filter((chave) => chave !== CACHE_NAME && !chave.startsWith(PREFIXO_VIDEOS)).map((chave) => caches.delete(chave))
            ))
            .then(() => self.clients.claim())
    );
});

// Lê o cabeçalho Range ("bytes=0-", "bytes=100-200", "bytes=-500"). Devolve { inicio, fim } (fim inclusive),
// null se não há Range utilizável (responde o arquivo inteiro) ou 'invalido' se está fora do arquivo (416).
function lerRange(cabecalho, total) {
    if (!cabecalho) return null;
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(cabecalho).trim());
    if (!m || (m[1] === '' && m[2] === '')) return null;
    let inicio, fim;
    if (m[1] === '') { // últimos N bytes
        const n = Number(m[2]);
        if (!n) return 'invalido';
        inicio = Math.max(0, total - n); fim = total - 1;
    } else {
        inicio = Number(m[1]);
        fim = m[2] === '' ? total - 1 : Math.min(Number(m[2]), total - 1);
    }
    if (!(inicio >= 0) || inicio >= total || fim < inicio) return 'invalido';
    return { inicio, fim };
}

function ehVideo(url) {
    return /\/videos\/[^/]+\.(mp4|webm)$/i.test(url.pathname);
}

// Vídeo baixado: serve do cache (com Range). Vídeo não baixado: vai para a rede, sem guardar.
async function responderVideo(req) {
    const cache = await caches.open(CACHE_VIDEOS);
    const guardado = await cache.match(req.url, { ignoreSearch: true });
    if (!guardado) return fetch(req);
    const buf = await guardado.arrayBuffer();
    const total = buf.byteLength;
    const tipo = guardado.headers.get('Content-Type') || 'video/mp4';
    const r = lerRange(req.headers.get('range'), total);
    if (r === 'invalido') return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
    if (!r) return new Response(buf, { status: 200, headers: { 'Content-Type': tipo, 'Content-Length': String(total), 'Accept-Ranges': 'bytes' } });
    const parte = buf.slice(r.inicio, r.fim + 1);
    return new Response(parte, {
        status: 206,
        headers: { 'Content-Type': tipo, 'Content-Length': String(parte.byteLength), 'Content-Range': `bytes ${r.inicio}-${r.fim}/${total}`, 'Accept-Ranges': 'bytes' }
    });
}

// Arquivos do próprio site: primeiro o cache (abre na hora), rede só se não estiver lá.
// Todo o resto (Supabase, fontes externas) passa direto, sem cache.
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    if (ehVideo(url)) { event.respondWith(responderVideo(req)); return; }

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