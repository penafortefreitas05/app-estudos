// ============================================================
// js/video-aprenda.js - "Aprenda em 1 min": vídeos curtos dentro do assunto (FocoPro)
// ============================================================
// Decidido em 06/11 e 08/11/2026: vídeo vertical dentro da tela do assunto (sem feed), com "Praticar →" sempre visível.
// Autorizado em 11/11/2026 ("pode subir").
//
// Offline: os vídeos NÃO entram no pacote do app. Quem quer assistir sem internet toca em
// "Baixar para ver sem internet"; o arquivo vai para um cache próprio (focopro-videos-v1) que o service worker
// preserva nas atualizações e serve com suporte a Range (sem isso o Chrome do Android não avança o vídeo).
import { esc } from './ui.js';

export const CACHE_VIDEOS = 'focopro-videos-v1';
const ARQUIVO_LISTA = 'data/videos.json';

// ---------- Regras puras (testáveis sem tela) ----------

// Vídeos de um assunto, na ordem do arquivo de dados
export function videosDoAssunto(lista, materia, assunto) {
    return (Array.isArray(lista) ? lista : []).filter(v => v && v.materia === materia && v.assunto === assunto && v.arquivo);
}

export function formatarDuracao(seg) {
    const s = Math.max(0, Math.round(Number(seg) || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function formatarTamanho(bytes) {
    const mb = (Number(bytes) || 0) / (1024 * 1024);
    return mb >= 0.95 ? `${mb.toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(mb * 1024))} KB`;
}

// ---------- Vídeo já visto (neste aparelho) ----------
// Na sequência do Aprender (vídeo → cartões → questões) o vídeo abre sozinho na primeira vez que o assunto é aberto.
const CHAVE_VISTOS = 'appEstudos_VideosVistos';
function lerVistos() {
    try { const v = JSON.parse(localStorage.getItem(CHAVE_VISTOS)); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
}
export const videoVisto = (v) => Boolean(v && lerVistos()[v.id]);
export function marcarVideoVisto(v) {
    if (!v || !v.id) return;
    const todos = lerVistos();
    if (todos[v.id]) return;
    todos[v.id] = new Date().toISOString().slice(0, 10);
    try { localStorage.setItem(CHAVE_VISTOS, JSON.stringify(todos)); } catch (e) { /* segue sem guardar */ }
}

// ---------- Lista de vídeos e cache ----------

let listaEmMemoria = null;

export async function carregarVideos() {
    if (listaEmMemoria) return listaEmMemoria;
    try {
        const r = await fetch(ARQUIVO_LISTA);
        if (!r.ok) throw new Error('lista de vídeos indisponível');
        const dados = await r.json();
        listaEmMemoria = Array.isArray(dados) ? dados : [];
    } catch (e) {
        return []; // sem lista: o app segue sem a faixa de vídeo (não guarda o erro, tenta de novo depois)
    }
    return listaEmMemoria;
}

const temCache = () => typeof caches !== 'undefined';
const urlAbsoluta = (arquivo) => new URL(arquivo, document.baseURI).href;

export async function videoBaixado(v) {
    if (!temCache()) return false;
    try {
        const c = await caches.open(CACHE_VIDEOS);
        return !!(await c.match(urlAbsoluta(v.arquivo)));
    } catch (e) { return false; }
}

// Baixa o arquivo INTEIRO (pedido sem Range) e guarda no cache de vídeos.
export async function baixarVideo(v) {
    if (!temCache()) throw new Error('Este navegador não guarda vídeos para ver sem internet.');
    // Pede armazenamento persistente: sem ele o Chrome pode apagar o vídeo quando faltar espaço
    let persistente = null;
    try { if (navigator.storage && navigator.storage.persist) persistente = await navigator.storage.persist(); } catch (e) { /* segue */ }
    const r = await fetch(urlAbsoluta(v.arquivo), { cache: 'reload' });
    if (!r.ok || r.status !== 200) throw new Error('Não foi possível baixar o vídeo agora.');
    const blob = await r.blob();
    if (!blob.size) throw new Error('O vídeo veio vazio. Tente de novo.');
    const c = await caches.open(CACHE_VIDEOS);
    await c.put(urlAbsoluta(v.arquivo), new Response(blob, { status: 200, headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(blob.size) } }));
    return { bytes: blob.size, persistente };
}

export async function removerVideo(v) {
    if (!temCache()) return false;
    const c = await caches.open(CACHE_VIDEOS);
    return c.delete(urlAbsoluta(v.arquivo));
}

// ---------- Tela do vídeo ----------

// v: item de data/videos.json. opcoes.aoPraticar (opcional): botão "Praticar →" (o chamador decide se há questões).
// opcoes.nivelPraticar: nome do nível que o Praticar abre. opcoes.aoFechar: chamado ao fechar.
// opcoes.aoContinuar (opcional): modo "sequência" (passo 1 de 3). O botão principal vira "Ver os cartões →", que marca o vídeo como visto
// e chama aoContinuar; o ✕ só fecha (volta ao Aprender). Sem aoContinuar (rever o vídeo), valem "Praticar →" e "Voltar ao assunto".
export async function abrirVideo(v, { aoPraticar, nivelPraticar = '', aoFechar, aoContinuar } = {}) {
    if (!v || document.querySelector('.video-tela')) return;
    const focoAntes = document.activeElement;
    const el = document.createElement('div');
    el.className = 'video-tela';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'video-titulo');
    el.innerHTML = `
        <header class="video-topo">
            <div>
                <p class="video-faixa">${typeof aoContinuar === 'function' ? 'Passo 1 de 3 · vídeo, cartões, questões' : `▶ Aprenda em 1 min · ${formatarDuracao(v.duracao)}`}</p>
                <h2 id="video-titulo" class="video-titulo">${esc(v.titulo)}</h2>
            </div>
            <button type="button" class="video-sair" data-acao="fechar" aria-label="Fechar o vídeo">✕</button>
        </header>
        <div class="video-palco">
            <video class="video-player" controls playsinline preload="metadata" controlslist="nodownload" aria-label="${esc(v.titulo)}"></video>
        </div>
        <p class="video-msg" role="status" aria-live="polite"></p>
        <div class="video-offline"></div>
        <div class="video-acoes">
            ${typeof aoContinuar === 'function'
                ? `<button type="button" class="leitura-btn entendi" data-acao="continuar">Ver os cartões →</button>`
                : `${typeof aoPraticar === 'function' ? `<button type="button" class="leitura-btn entendi" data-acao="praticar">Praticar →</button>` : ''}
            <button type="button" class="leitura-btn ainda" data-acao="fechar">Voltar ao assunto</button>`}
        </div>`;
    const q = sel => el.querySelector(sel);
    const player = q('.video-player');
    const msg = q('.video-msg');
    const area = q('.video-offline');
    let fechada = false;

    async function desenharOffline(aviso = '') {
        const baixado = await videoBaixado(v);
        if (fechada) return;
        area.innerHTML = baixado
            ? `<p class="video-estado ok">✓ Baixado: toca sem internet (${formatarTamanho(v.bytes)} neste aparelho)</p>
               <button type="button" class="video-link" data-acao="remover">Remover do aparelho</button>`
            : `<button type="button" class="video-baixar" data-acao="baixar">⬇ Baixar para ver sem internet (${formatarTamanho(v.bytes)})</button>`;
        if (aviso) msg.textContent = aviso;
    }

    player.addEventListener('error', () => {
        msg.textContent = navigator.onLine === false
            ? 'Sem internet e o vídeo não está baixado. Baixe quando estiver online para ver sem rede.'
            : 'Não foi possível carregar o vídeo agora. Tente de novo em instantes.';
    });
    player.addEventListener('playing', () => { msg.textContent = ''; });
    player.addEventListener('ended', () => marcarVideoVisto(v));

    async function agir(acao, botao) {
        if (acao === 'fechar') return fechar();
        if (acao === 'continuar') {
            marcarVideoVisto(v);
            fechar();
            if (typeof aoContinuar === 'function') setTimeout(aoContinuar, 0);
            return;
        }
        if (acao === 'praticar') { fechar(); if (typeof aoPraticar === 'function') aoPraticar(); return; }
        if (acao === 'baixar') {
            botao.disabled = true;
            botao.textContent = 'Baixando…';
            try {
                const r = await baixarVideo(v);
                await desenharOffline(r.persistente === false ? 'Baixado. Aviso: o navegador não garantiu o espaço; se faltar memória no aparelho, ele pode apagar o vídeo.' : 'Baixado. Agora toca sem internet.');
            } catch (e) {
                await desenharOffline(e && e.message ? e.message : 'Não foi possível baixar o vídeo agora.');
            }
            return;
        }
        if (acao === 'remover') { await removerVideo(v); await desenharOffline('Vídeo removido do aparelho.'); }
    }

    // Teclado: Tab fica dentro da tela e Esc fecha só o vídeo. Setas e espaço seguem para o player.
    // A leitura e o Aprender ignoram o teclado enquanto esta tela existe (ver .video-tela nesses arquivos).
    function aoTeclar(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return fechar(); }
        if (e.key === 'Tab') {
            const focaveis = [...el.querySelectorAll('button:not([disabled]), video[controls]')];
            if (!focaveis.length) return;
            const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
            if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
            else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
            else if (!el.contains(document.activeElement)) { e.preventDefault(); primeiro.focus(); }
        }
    }
    // Teclas digitadas dentro desta tela não chegam aos atalhos do app (letras do Modo Foco, "/")
    el.addEventListener('keydown', (e) => { if (e.key !== 'Escape') e.stopPropagation(); });

    function fechar() {
        if (fechada) return;
        fechada = true;
        document.removeEventListener('keydown', aoTeclar, true);
        try { player.pause(); } catch (e) { /* segue */ }
        player.removeAttribute('src');
        player.load();
        el.classList.remove('visivel');
        setTimeout(() => el.remove(), 180);
        if (focoAntes && typeof focoAntes.focus === 'function' && document.contains(focoAntes)) focoAntes.focus({ preventScroll: true });
        if (typeof aoFechar === 'function') aoFechar();
    }

    el.addEventListener('click', (e) => {
        const botao = e.target.closest('[data-acao]');
        if (botao && !botao.disabled) agir(botao.dataset.acao, botao);
    });
    document.addEventListener('keydown', aoTeclar, true);
    document.body.appendChild(el);
    player.src = urlAbsoluta(v.arquivo);
    await desenharOffline();
    requestAnimationFrame(() => el.classList.add('visivel'));
    const primeiro = q('.video-baixar') || q('.leitura-btn');
    if (primeiro) primeiro.focus({ preventScroll: true });
}
