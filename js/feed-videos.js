// ============================================================
// js/feed-videos.js - Vídeos em sequência (feed v1) (FocoPro, 15/11/2026)
// ============================================================
// Desenho da sala Design aprovado pelo Nathan em 15/11: uma TRILHA de vídeos, não um feed infinito.
// - Entra pelo Aprender ("Assistir em sequência" / "Continuar vídeos"); não tem item no menu.
// - Um vídeo vertical por tela; deslizar (ou ↑ ↓) troca de vídeo; tocar no vídeo pausa ou retoma.
// - Não avança sozinho: no fim, "Vídeo concluído" com "Praticar este assunto" e "Próximo vídeo".
// - Ordem = ordem do Aprender (matérias e trilha de pré-requisitos dos assuntos) + campo "ordem" do vídeo.
// - "Assistido" = chegou a 90% do vídeo (mesma marca do Aprender). Assistir NUNCA marca "Aprendi".
// - Sem internet: vídeo não baixado mostra o aviso e NÃO é pulado (a ordem da trilha importa).
// - Downloads só com toque do aluno ("Baixar"), na lista da trilha.

import { esc } from './ui.js';
import { icone } from './icones.js';
import { formatarDuracao, formatarTamanho, videoVisto, marcarVideoVisto, videoBaixado, baixarVideo, removerVideo } from './video-aprenda.js';

const CHAVE_POSICAO = 'appEstudos_FeedVideosPosicao';
const SEGUIDOS_PARA_SUGERIR = 3;

const urlAbsoluta = (arquivo) => new URL(arquivo, document.baseURI).href;
function ler(chave, padrao) { try { const v = JSON.parse(localStorage.getItem(chave)); return v ?? padrao; } catch (e) { return padrao; } }
function gravar(chave, v) { try { localStorage.setItem(chave, JSON.stringify(v)); } catch (e) { /* segue sem guardar */ } }

// ---------- Regras puras ----------
// grupos: [{ materia, assuntos: [{ assunto }] }] na ordem do Aprender
export function montarTrilha(videos, grupos) {
    const lista = [];
    const usados = new Set();
    (grupos || []).forEach((g) => {
        (g.assuntos || []).forEach((a) => {
            const doAssunto = (videos || []).filter((v) => v.materia === g.materia && v.assunto === a.assunto)
                .map((v, i) => ({ v, i }))
                .sort((x, y) => (Number(x.v.ordem) || 99) - (Number(y.v.ordem) || 99) || x.i - y.i)
                .map((x) => x.v);
            doAssunto.forEach((v) => { if (!usados.has(v.id)) { usados.add(v.id); lista.push(v); } });
        });
    });
    return lista;
}

// Onde retomar: o primeiro não assistido depois do último aberto; sem histórico, o primeiro não assistido.
export function indiceParaRetomar(trilha, visto = videoVisto, posicao = ler(CHAVE_POSICAO, null)) {
    if (!trilha.length) return 0;
    const ult = posicao && trilha.findIndex((v) => v.id === posicao.id);
    const inicio = ult >= 0 ? ult : 0;
    for (let k = 0; k < trilha.length; k++) {
        const i = (inicio + k) % trilha.length;
        if (!visto(trilha[i])) return i;
    }
    return ult >= 0 ? ult : 0;
}

export function resumoTrilha(trilha, visto = videoVisto) {
    const assistidos = trilha.filter((v) => visto(v)).length;
    const i = indiceParaRetomar(trilha, visto);
    return { total: trilha.length, assistidos, proximo: trilha[i] || null, posicao: i + 1, comecou: assistidos > 0 || Boolean(ler(CHAVE_POSICAO, null)) };
}

const curto = (m) => String(m || '').replace(/ &.*$/, '').replace(/,.*$/, '');
const assuntoCurto = (a) => String(a || '').replace(/\s*\(.*$/, '');

// ---------- Tela ----------
// opcoes.inicio: índice do vídeo inicial. opcoes.aoPraticar(materia, assunto): fecha o feed e abre o Praticar.
// opcoes.podePraticar(materia, assunto): false esconde o botão. opcoes.aoFechar(): ao fechar.
export function abrirFeed(trilha, { inicio = 0, aoPraticar, podePraticar = () => true, aoFechar } = {}) {
    if (!trilha || !trilha.length || document.querySelector('.feed-tela')) return;
    let indice = Math.max(0, Math.min(inicio, trilha.length - 1));
    let seguidos = 0;           // vídeos concluídos em sequência nesta sessão
    let concluido = false;      // tela "Vídeo concluído" aberta
    let listaAberta = false;
    let fechada = false;
    const focoAntes = document.activeElement;

    const el = document.createElement('div');
    el.className = 'feed-tela';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Vídeos em sequência');
    el.innerHTML = `
        <header class="feed-topo">
            <button type="button" class="feed-btn-ic" data-acao="fechar" aria-label="Voltar ao Aprender">${icone('fechar')}</button>
            <div class="feed-topo-texto"><p class="feed-faixa">Aprender em vídeo</p><p class="feed-pos" aria-live="polite"></p></div>
            <button type="button" class="feed-btn-ic" data-acao="lista" aria-label="Ver a trilha de vídeos">${icone('grade')}</button>
        </header>
        <div class="feed-palco">
            <video class="feed-video" playsinline preload="metadata" controlslist="nodownload noplaybackrate" disablepictureinpicture></video>
            <div class="feed-aviso" hidden></div>
            <button type="button" class="feed-play" data-acao="alternar" aria-label="Pausar ou continuar">${icone('play')}</button>
            <div class="feed-fim" hidden></div>
        </div>
        <div class="feed-info">
            <h2 class="feed-titulo"></h2>
            <p class="feed-assunto"></p>
            <div class="feed-progresso" aria-hidden="true"><i></i></div>
            <div class="feed-linha">
                <span class="feed-tempo">0:00 / 0:00</span>
                <button type="button" class="feed-btn-ic feed-som" data-acao="som" aria-label="Desligar o som">${icone('play')}</button>
            </div>
            <div class="feed-acoes">
                <button type="button" class="leitura-btn ainda" data-acao="praticar">Praticar este assunto</button>
                <button type="button" class="leitura-btn entendi" data-acao="proximo">Próximo ↓</button>
            </div>
            <p class="feed-dica">Deslize para cima para o próximo · toque no vídeo para pausar</p>
        </div>
        <div class="feed-lista" hidden></div>`;
    const q = (s) => el.querySelector(s);
    const player = q('.feed-video');

    function atual() { return trilha[indice]; }

    function iconeSom() {
        const b = q('.feed-som');
        b.innerHTML = player.muted
            ? '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'
            : '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
        b.setAttribute('aria-label', player.muted ? 'Ligar o som' : 'Desligar o som');
    }

    function tempo() {
        const d = player.duration && isFinite(player.duration) ? player.duration : (atual().duracao || 0);
        const t = player.currentTime || 0;
        q('.feed-tempo').textContent = `${formatarDuracao(Math.floor(t))} / ${formatarDuracao(Math.round(d))}`;
        q('.feed-progresso i').style.width = d ? `${Math.min(100, (t * 100) / d)}%` : '0%';
        // Assistido = 90% do vídeo
        if (d && t / d >= 0.9 && !videoVisto(atual())) marcarVideoVisto(atual());
    }

    function estadoPlay() {
        const b = q('.feed-play');
        const pausado = player.paused;
        b.classList.toggle('pausado', pausado);
        b.innerHTML = pausado ? icone('play') : '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>';
        b.setAttribute('aria-label', pausado ? 'Continuar o vídeo' : 'Pausar o vídeo');
    }

    async function carregar({ tocar = true } = {}) {
        const v = atual();
        concluido = false;
        el.classList.remove('feed-concluido');
        q('.feed-fim').hidden = true;
        q('.feed-aviso').hidden = true;
        gravar(CHAVE_POSICAO, { id: v.id, em: Date.now() });
        q('.feed-pos').textContent = `${curto(v.materia)} · ${indice + 1} de ${trilha.length}${videoVisto(v) ? ' · Assistido' : ''}`;
        q('.feed-titulo').textContent = v.titulo;
        q('.feed-assunto').textContent = assuntoCurto(v.assunto);
        const pratica = q('[data-acao="praticar"]');
        pratica.hidden = !(typeof aoPraticar === 'function' && podePraticar(v.materia, v.assunto));
        q('[data-acao="proximo"]').textContent = indice < trilha.length - 1 ? 'Próximo ↓' : 'Fim da trilha';
        player.src = urlAbsoluta(v.arquivo);
        tempo();
        // Sem internet e sem o arquivo no aparelho: avisa e não pula (a ordem da trilha importa)
        if (navigator.onLine === false && !(await videoBaixado(v))) {
            if (fechada || atual() !== v) return;
            mostrarAviso(`Este vídeo não está no aparelho. Baixe quando tiver internet.`);
            return;
        }
        if (tocar) {
            try { await player.play(); } catch (e) { /* o navegador pode pedir um toque: o botão de play fica visível */ }
        }
        estadoPlay();
    }

    function mostrarAviso(texto) {
        const a = q('.feed-aviso');
        a.hidden = false;
        a.innerHTML = `<p>${icone('alerta')}${esc(texto)}</p><button type="button" class="leitura-btn ainda" data-acao="lista">Ver a trilha e os downloads</button>`;
        estadoPlay();
    }

    function ir(novo) {
        if (novo < 0 || novo >= trilha.length || novo === indice) return;
        try { player.pause(); } catch (e) { /* segue */ }
        el.classList.remove('feed-sobe', 'feed-desce');
        void el.offsetWidth;
        el.classList.add(novo > indice ? 'feed-sobe' : 'feed-desce');
        indice = novo;
        carregar();
    }

    function telaFim() {
        const v = atual();
        concluido = true;
        seguidos += 1;
        q('.feed-aviso').hidden = true;
        el.classList.add('feed-concluido');
        marcarVideoVisto(v);
        const prox = trilha[indice + 1];
        const fim = q('.feed-fim');
        const pratica = typeof aoPraticar === 'function' && podePraticar(v.materia, v.assunto);
        fim.hidden = false;
        fim.innerHTML = prox ? `
            <p class="feed-fim-titulo">${icone('feito')}Vídeo concluído</p>
            <p class="feed-fim-texto">Você terminou “${esc(v.titulo)}”.</p>
            <p class="feed-fim-rotulo">Próximo na trilha</p>
            <p class="feed-fim-prox">${esc(prox.titulo)} <span>${esc(curto(prox.materia))} · ${formatarDuracao(prox.duracao)}</span></p>
            ${seguidos >= SEGUIDOS_PARA_SUGERIR ? `<p class="feed-fim-sugestao">Você assistiu a ${seguidos} vídeos seguidos. Que tal praticar algumas questões?</p>` : ''}
            <div class="feed-fim-acoes">
                ${pratica ? `<button type="button" class="leitura-btn entendi" data-acao="praticar">Praticar este assunto</button>` : ''}
                <button type="button" class="leitura-btn ${pratica ? 'ainda' : 'entendi'}" data-acao="proximo">Próximo vídeo ↓</button>
            </div>
            <p class="feed-fim-nota">Assistir não marca o assunto como aprendido.</p>`
            : `
            <p class="feed-fim-titulo">${icone('feito')}Fim da trilha</p>
            <p class="feed-fim-texto">Você terminou os vídeos disponíveis nesta trilha.</p>
            <div class="feed-fim-acoes">
                ${pratica ? `<button type="button" class="leitura-btn entendi" data-acao="praticar">Praticar este assunto</button>` : ''}
                <button type="button" class="leitura-btn ainda" data-acao="fechar">Voltar ao Aprender</button>
            </div>
            <p class="feed-fim-nota">Assistir não marca o assunto como aprendido.</p>`;
        q('.feed-pos').textContent = `${curto(v.materia)} · ${indice + 1} de ${trilha.length} · Assistido`;
        const b = fim.querySelector('button');
        if (b) b.focus({ preventScroll: true });
    }

    async function desenharLista() {
        const caixa = q('.feed-lista');
        const baixados = await Promise.all(trilha.map((v) => videoBaixado(v)));
        if (fechada) return;
        const nBaixados = baixados.filter(Boolean).length;
        const faltamBytes = trilha.reduce((s, v, i) => s + (baixados[i] ? 0 : (v.bytes || 0)), 0);
        let materiaAnt = '';
        caixa.innerHTML = `
            <div class="feed-lista-topo"><button type="button" class="sm-link" data-acao="lista-fechar">← Voltar ao vídeo</button><h3>Trilha de vídeos</h3>
                <p>${trilha.filter((v) => videoVisto(v)).length} de ${trilha.length} assistidos · ${nBaixados} de ${trilha.length} no aparelho</p></div>
            <div class="feed-lista-itens">${trilha.map((v, i) => {
                const cab = v.materia !== materiaAnt ? `<p class="feed-lista-materia">${esc(v.materia)}</p>` : '';
                materiaAnt = v.materia;
                return `${cab}<div class="feed-lista-item${i === indice ? ' atual' : ''}">
                    <button type="button" class="feed-lista-ir" data-acao="ir" data-i="${i}">
                        <span class="feed-lista-num">${i + 1}</span>
                        <span class="feed-lista-nome"><b>${esc(v.titulo)}</b><span>${esc(assuntoCurto(v.assunto))} · ${formatarDuracao(v.duracao)}${videoVisto(v) ? ' · Assistido' : ''}</span></span>
                    </button>
                    ${baixados[i]
                        ? `<button type="button" class="feed-lista-dl ok" data-acao="remover" data-i="${i}" aria-label="Remover ${esc(v.titulo)} do aparelho" title="No aparelho · toque para remover">${icone('certo')}</button>`
                        : `<button type="button" class="feed-lista-dl" data-acao="baixar" data-i="${i}" aria-label="Baixar ${esc(v.titulo)} (${formatarTamanho(v.bytes)})" title="Baixar (${formatarTamanho(v.bytes)})">⬇</button>`}
                </div>`;
            }).join('')}</div>
            ${nBaixados < trilha.length ? `<button type="button" class="sm-sec-btn feed-baixar-todos" data-acao="baixar-todos">Baixar os ${trilha.length - nBaixados} que faltam (${formatarTamanho(faltamBytes)})</button>` : '<p class="feed-lista-ok">Todos os vídeos estão no aparelho: tocam sem internet.</p>'}
            <p class="feed-lista-msg" role="status" aria-live="polite"></p>`;
    }

    function abrirLista() {
        listaAberta = true;
        try { player.pause(); } catch (e) { /* segue */ }
        estadoPlay();
        q('.feed-lista').hidden = false;
        desenharLista();
    }
    function fecharLista() { listaAberta = false; q('.feed-lista').hidden = true; }

    async function agir(acao, botao) {
        const v = atual();
        if (acao === 'fechar') return fechar();
        if (acao === 'alternar') {
            if (concluido) return;
            if (player.paused) { try { await player.play(); } catch (e) { /* segue */ } } else player.pause();
            return estadoPlay();
        }
        if (acao === 'som') { player.muted = !player.muted; return iconeSom(); }
        if (acao === 'proximo') {
            if (indice < trilha.length - 1) return ir(indice + 1);
            return telaFim();
        }
        if (acao === 'praticar') {
            fechar();
            if (typeof aoPraticar === 'function') setTimeout(() => aoPraticar(v.materia, v.assunto), 0);
            return;
        }
        if (acao === 'lista') return abrirLista();
        if (acao === 'lista-fechar') return fecharLista();
        if (acao === 'ir') {
            fecharLista(); seguidos = 0;
            const n = Number(botao.dataset.i);
            if (n === indice) return carregar();
            return ir(n);
        }
        const msg = () => q('.feed-lista-msg');
        if (acao === 'baixar' || acao === 'baixar-todos') {
            const alvos = acao === 'baixar' ? [trilha[Number(botao.dataset.i)]] : trilha;
            botao.disabled = true;
            let feitos = 0;
            for (const alvo of alvos) {
                if (await videoBaixado(alvo)) continue;
                if (msg()) msg().textContent = `Baixando ${alvo.titulo}…`;
                try { await baixarVideo(alvo); feitos++; } catch (e) { if (msg()) msg().textContent = e && e.message ? e.message : 'Não foi possível baixar agora.'; break; }
            }
            await desenharLista();
            if (feitos && msg()) msg().textContent = feitos === 1 ? 'Baixado. Toca sem internet.' : `${feitos} vídeos baixados. Tocam sem internet.`;
            return;
        }
        if (acao === 'remover') { await removerVideo(trilha[Number(botao.dataset.i)]); await desenharLista(); if (msg()) msg().textContent = 'Vídeo removido do aparelho.'; }
    }

    // Gestos: deslizar para cima = próximo; para baixo = anterior
    let toque = null;
    q('.feed-palco').addEventListener('touchstart', (e) => { if (e.touches.length === 1) toque = { y: e.touches[0].clientY, x: e.touches[0].clientX, t: Date.now() }; }, { passive: true });
    q('.feed-palco').addEventListener('touchend', (e) => {
        if (!toque || listaAberta) return;
        const t = e.changedTouches[0];
        const dy = t.clientY - toque.y, dx = t.clientX - toque.x;
        toque = null;
        if (Math.abs(dy) < 60 || Math.abs(dy) < Math.abs(dx) * 1.5) return;
        e.preventDefault();
        if (dy < 0) { if (indice < trilha.length - 1) ir(indice + 1); else telaFim(); }
        else ir(indice - 1);
    });
    // Roda do mouse (computador): um passo por gesto
    let rodaEm = 0;
    q('.feed-palco').addEventListener('wheel', (e) => {
        if (listaAberta || Math.abs(e.deltaY) < 30 || Date.now() - rodaEm < 700) return;
        rodaEm = Date.now();
        e.preventDefault();
        if (e.deltaY > 0) { if (indice < trilha.length - 1) ir(indice + 1); } else ir(indice - 1);
    }, { passive: false });

    player.addEventListener('timeupdate', tempo);
    player.addEventListener('loadedmetadata', tempo);
    player.addEventListener('play', estadoPlay);
    player.addEventListener('pause', estadoPlay);
    player.addEventListener('ended', telaFim);
    player.addEventListener('error', () => {
        if (fechada) return;
        mostrarAviso(navigator.onLine === false ? 'Este vídeo não está no aparelho. Baixe quando tiver internet.' : 'Não foi possível carregar o vídeo agora. Tente de novo em instantes.');
    });

    function aoTeclar(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return listaAberta ? fecharLista() : fechar(); }
        if (listaAberta) return;
        if (e.target && e.target.closest && e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;
        if (e.key === ' ' || e.key === 'k') { e.preventDefault(); e.stopPropagation(); agir('alternar'); }
        else if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); e.stopPropagation(); agir('proximo'); }
        else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); e.stopPropagation(); ir(indice - 1); }
        else if (e.key === 'm') { e.preventDefault(); e.stopPropagation(); agir('som'); }
    }
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
        const b = e.target.closest('[data-acao]');
        if (b && !b.disabled) agir(b.dataset.acao, b);
    });
    document.addEventListener('keydown', aoTeclar, true);
    document.body.appendChild(el);
    iconeSom();
    carregar();
    requestAnimationFrame(() => el.classList.add('visivel'));
    const p = q('.feed-play');
    if (p) p.focus({ preventScroll: true });
}
