// ============================================================
// js/caderno-erros.js - Caderno de erros (FocoPro)
// ============================================================
// Decidido com o Nathan em 05/11/2026: aqui ficam TODAS as questões que ele errou, sem pressão.
// "Revisar hoje" é a fila pequena do dia (teto); o Caderno é o estoque, com filtros e uma lista
// curta por vez. É também onde a IA explica o erro, com limite por dia (só chamada nova conta;
// explicação já guardada abre de graça). A tela lê o histórico; não muda a agenda de revisão.

import { esc } from './ui.js';
import { formatarDiaCurto } from './revisao.js';

const CHAVE_EXPLICACOES = 'appEstudos_ExplicacoesIA';
const CHAVE_USO_IA = 'appEstudos_UsoIA';
const PAGINA = 10;

export const ESTADOS = [['abertas', 'Para refazer'], ['superadas', 'Já acertei depois']];

// Questões com pelo menos um erro, da mais recente para a mais antiga
export function listarErros(questoes, historico) {
    return questoes
        .map((q) => ({ q, h: historico[String(q.id)] }))
        .filter(({ h }) => h && (h.erros || 0) > 0)
        .map(({ q, h }) => ({ q, h, estado: h.ultimaResposta === 'errado' ? 'abertas' : 'superadas' }))
        .sort((a, b) => (b.h.ultimaData || 0) - (a.h.ultimaData || 0));
}

export function contar(itens) {
    const por = { abertas: 0, superadas: 0 };
    itens.forEach((i) => { por[i.estado]++; });
    return por;
}

export function filtrarItens(itens, { estado = 'abertas', materia = '', busca = '' } = {}) {
    const b = busca.trim().toLowerCase();
    return itens.filter((i) =>
        i.estado === estado &&
        (!materia || (i.q.materia || 'Geral') === materia) &&
        (!b || `${i.q.assunto || ''} ${i.q.pergunta || ''}`.toLowerCase().includes(b)));
}

export function materiasDe(itens) {
    const m = {};
    itens.forEach((i) => { const k = i.q.materia || 'Geral'; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function ler(chave, padrao) { try { const v = JSON.parse(localStorage.getItem(chave)); return v ?? padrao; } catch (e) { return padrao; } }
function gravar(chave, v) { try { localStorage.setItem(chave, JSON.stringify(v)); } catch (e) { /* segue sem guardar */ } }

const chaveExplicacao = (q, letra) => `${q.id}|${letra}`;
export const explicacaoGuardada = (q, letra) => ler(CHAVE_EXPLICACOES, {})[chaveExplicacao(q, letra)] || '';
function guardarExplicacao(q, letra, texto) {
    const todas = ler(CHAVE_EXPLICACOES, {});
    todas[chaveExplicacao(q, letra)] = texto;
    gravar(CHAVE_EXPLICACOES, todas);
}
export function usoDeHoje() {
    const u = ler(CHAVE_USO_IA, null);
    return u && u.dia === hojeLocal() ? u : null;
}

// opcoes.questoes, opcoes.historico: dados atuais
// opcoes.aoRefazer(q): fecha o caderno e põe a questão para refazer
// opcoes.pedirIA(questaoId, letra): Promise<{ ok, explicacao?, usoHoje?, limiteDia?, message? }>
// opcoes.naFila(id): a questão está na fila de hoje?
export function abrirCaderno({ questoes, historico, aoRefazer, pedirIA, naFila = () => false } = {}) {
    if (document.querySelector('.ce-tela')) return;
    const itens = listarErros(questoes || [], historico || {});
    const focoAntes = document.activeElement;
    let estado = 'abertas', materia = '', busca = '', mostrando = PAGINA;
    const emUso = new Set();

    const el = document.createElement('div');
    el.className = 'ce-tela';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'ce-titulo');
    el.innerHTML = `
        <header class="ce-topo">
            <div>
                <h2 id="ce-titulo" class="ce-titulo">📕 Caderno de erros</h2>
                <p class="ce-sub" aria-live="polite"></p>
            </div>
            <button type="button" class="ce-sair" data-ce="fechar" aria-label="Fechar o caderno de erros">✕</button>
        </header>
        <div class="ce-corpo">
            <div class="ce-estados"></div>
            <div class="ce-materias"></div>
            <input type="search" class="ce-busca" placeholder="Buscar por assunto ou texto" aria-label="Buscar no caderno de erros" autocomplete="off">
            <p class="ce-uso"></p>
            <div class="ce-lista"></div>
        </div>`;
    document.body.appendChild(el);
    document.body.classList.add('modo-caderno');

    const fechar = () => {
        document.removeEventListener('keydown', aoTeclar, true);
        el.remove();
        document.body.classList.remove('modo-caderno');
        if (focoAntes && focoAntes.focus) focoAntes.focus();
    };
    const aoTeclar = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(); } };
    document.addEventListener('keydown', aoTeclar, true);

    const sub = el.querySelector('.ce-sub');
    const elEstados = el.querySelector('.ce-estados');
    const elMaterias = el.querySelector('.ce-materias');
    const elUso = el.querySelector('.ce-uso');
    const elLista = el.querySelector('.ce-lista');

    function textoUso() {
        const u = usoDeHoje();
        elUso.textContent = u ? `Explicações com IA hoje: ${u.uso} de ${u.limite}. As já geradas abrem de graça.` : 'Explicações com IA: há um limite por dia. As já geradas abrem de graça.';
    }

    function cartao({ q, h }) {
        const letra = h.letraErrada || '';
        const guardada = letra ? explicacaoGuardada(q, letra) : '';
        const volta = h.revisaoEm ? (naFila(q.id) ? 'Na fila de hoje' : `Volta em ${formatarDiaCurto(h.revisaoEm)}`) : 'Fora da revisão';
        return `
            <article class="ce-item" data-id="${esc(String(q.id))}">
                <p class="ce-meta">${esc(q.materia || 'Geral')} · ${esc(q.assunto || 'Geral')}</p>
                <p class="ce-pergunta">${esc(q.pergunta || '')}</p>
                <p class="ce-info${naFila(q.id) ? ' urgente' : ''}">${naFila(q.id) ? '⏰ ' : ''}${h.erros} ${h.erros === 1 ? 'erro' : 'erros'} · ${esc(volta)}</p>
                <div class="ce-acoes">
                    <button type="button" class="ce-btn principal" data-ce="refazer">▶ Refazer</button>
                    ${letra ? `<button type="button" class="ce-btn ia" data-ce="ia">${guardada ? 'Ver explicação' : 'Entender meu erro com IA'}</button>` : ''}
                </div>
                <div class="ce-ia" ${guardada ? '' : 'hidden'}>${esc(guardada)}</div>
            </article>`;
    }

    function desenhar() {
        const todosDoEstado = itens.filter((i) => i.estado === estado);
        const por = contar(itens);
        sub.textContent = itens.length ? `${por.abertas} para refazer · ${por.superadas} já acertadas depois` : '';
        elEstados.innerHTML = ESTADOS.map(([id, nome]) =>
            `<button type="button" class="ce-chip ${estado === id ? 'ativo' : ''}" data-ce="estado" data-v="${id}">${nome} <span>${por[id]}</span></button>`).join('');
        const mats = materiasDe(todosDoEstado);
        elMaterias.innerHTML = mats.length
            ? `<button type="button" class="ce-mat todas ${materia === '' ? 'ativo' : ''}" data-ce="materia" data-v=""><span class="ce-mat-nome">Todas as matérias</span><span class="ce-mat-n">${todosDoEstado.length}</span></button>` +
              mats.map(([m, n]) => `<button type="button" class="ce-mat ${materia === m ? 'ativo' : ''}" data-ce="materia" data-v="${esc(m)}"><span class="ce-mat-nome">${esc(m)}</span><span class="ce-mat-n">${n}</span></button>`).join('')
            : '';
        const lista = filtrarItens(itens, { estado, materia, busca });
        if (!itens.length) {
            elLista.innerHTML = '<p class="ce-vazio">Você ainda não errou nenhuma questão. Quando errar, ela aparece aqui.</p>';
        } else if (!lista.length) {
            elLista.innerHTML = '<p class="ce-vazio">Nada por aqui com esse filtro.</p>';
        } else {
            elLista.innerHTML = (estado === 'abertas' ? `<button type="button" class="ce-btn ce-todas principal" data-ce="refazer-todas">▶ Refazer ${materia ? 'esta matéria' : 'todas'} no Foco (${lista.length})</button>` : '') +
                lista.slice(0, mostrando).map(cartao).join('') +
                (lista.length > mostrando ? `<button type="button" class="ce-mais" data-ce="mais">Mostrar mais (${lista.length - mostrando})</button>` : '');
        }
        textoUso();
    }

    el.addEventListener('input', (e) => {
        if (e.target.classList.contains('ce-busca')) { busca = e.target.value; mostrando = PAGINA; desenhar(); }
    });

    el.addEventListener('click', async (e) => {
        const alvo = e.target.closest('[data-ce]');
        if (!alvo) return;
        const acao = alvo.dataset.ce;
        if (acao === 'fechar') return fechar();
        if (acao === 'estado') { estado = alvo.dataset.v; materia = ''; mostrando = PAGINA; return desenhar(); }
        if (acao === 'materia') { materia = alvo.dataset.v; mostrando = PAGINA; return desenhar(); }
        if (acao === 'mais') { mostrando += PAGINA; return desenhar(); }
        if (acao === 'refazer-todas') {
            const lista = filtrarItens(itens, { estado, materia, busca }).map((i) => i.q);
            fechar(); if (aoRefazer && lista.length) aoRefazer(lista); return;
        }
        const art = alvo.closest('.ce-item');
        const item = art && itens.find((i) => String(i.q.id) === art.dataset.id);
        if (!item) return;
        if (acao === 'refazer') { fechar(); if (aoRefazer) aoRefazer(item.q); return; }
        if (acao === 'ia') {
            const caixa = art.querySelector('.ce-ia');
            const letra = item.h.letraErrada;
            const guardada = explicacaoGuardada(item.q, letra);
            if (guardada) { caixa.hidden = !caixa.hidden; return; }
            if (emUso.has(art.dataset.id) || !pedirIA) return;
            emUso.add(art.dataset.id);
            alvo.disabled = true;
            alvo.textContent = 'Pensando...';
            let r;
            try { r = await pedirIA(String(item.q.id), letra); } catch (err) { r = { ok: false, message: 'Sem conexão com a IA agora.' }; }
            emUso.delete(art.dataset.id);
            alvo.disabled = false;
            if (r && r.ok && r.explicacao) {
                guardarExplicacao(item.q, letra, r.explicacao);
                if (Number.isFinite(r.usoHoje) && Number.isFinite(r.limiteDia)) gravar(CHAVE_USO_IA, { dia: hojeLocal(), uso: r.usoHoje, limite: r.limiteDia });
                caixa.textContent = r.explicacao;
                caixa.hidden = false;
                alvo.textContent = 'Ver explicação';
                textoUso();
            } else {
                alvo.textContent = 'Entender meu erro com IA';
                caixa.textContent = (r && r.message) || 'A explicação não veio agora. Tente de novo mais tarde.';
                caixa.hidden = false;
            }
        }
    });

    desenhar();
    const sair = el.querySelector('.ce-sair');
    if (sair) sair.focus();
}
