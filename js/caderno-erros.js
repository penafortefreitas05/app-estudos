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
const CHAVE_NOTAS = 'appEstudos_AnotacoesAssunto';

// Nomes decididos em 11/11/2026: "Para refazer" e "Superadas"
export const ESTADOS = [['abertas', 'Para refazer'], ['superadas', 'Superadas']];

// Texto da alternativa de uma letra ("A) ...", ou Certo/Errado nas questões C/E). '' se não achar.
export function textoDaAlternativa(q, letra) {
    const alts = Array.isArray(q && q.alternativas) ? q.alternativas.map(String) : [];
    const L = String(letra || '').trim().toUpperCase();
    if (!L || !alts.length) return '';
    const achada = alts.find((a) => new RegExp(`^\\s*${L}\\s*[).:-]`).test(a));
    if (achada) return achada.replace(new RegExp(`^\\s*${L}\\s*[).:-]\\s*`), '').trim();
    if ((L === 'C' || L === 'E') && alts.length === 2) return alts[L === 'C' ? 0 : 1];
    const i = 'ABCDE'.indexOf(L);
    return i >= 0 && alts[i] ? alts[i].replace(/^\s*[A-E]\s*[).:-]\s*/, '').trim() : '';
}

// ---------- Anotações por assunto (aba Superadas) ----------
export const chaveNota = (materia, assunto) => `${materia || 'Geral'}|${assunto || 'Geral'}`;
export function lerNotas() { const v = ler(CHAVE_NOTAS, {}); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
export function gravarNota(chave, texto) {
    const todas = lerNotas();
    if (String(texto || '').trim()) todas[chave] = String(texto); else delete todas[chave];
    gravar(CHAVE_NOTAS, todas);
}
// Uma linha só: "Conceito: primeira frase do resumo", do primeiro cartão do assunto. '' se não houver cartão.
export function linhaConceito(cartoes) {
    const c = Array.isArray(cartoes) ? cartoes.find((x) => x && x.conceito) : null;
    if (!c) return '';
    const frase = String(c.resumo || '').split(/(?<=[.!?])\s/)[0].trim();
    return frase ? `${c.conceito}: ${frase}` : String(c.conceito);
}

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
// opcoes.pedirGabarito(q, letra): Promise<{ ok, gabarito?, message? }> (funciona offline com o pacote baixado)
// opcoes.cartoesDoAssunto(materia, assunto): cartões do assunto (para a linha de conceito)
// opcoes.naFila(id): a questão está na fila de hoje?
export function abrirCaderno({ questoes, historico, aoRefazer, pedirIA, pedirGabarito, cartoesDoAssunto = () => [], naFila = () => false } = {}) {
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
                <div class="ce-resp" hidden></div>
                <div class="ce-acoes">
                    ${pedirGabarito ? '<button type="button" class="ce-btn" data-ce="resposta">Ver resposta e explicação</button>' : ''}
                    <button type="button" class="ce-btn principal" data-ce="refazer">▶ Refazer</button>
                    ${letra ? `<button type="button" class="ce-btn ia" data-ce="ia">${guardada ? 'Ver explicação' : 'Entender meu erro com IA'}</button>` : ''}
                </div>
                <div class="ce-ia" ${guardada ? '' : 'hidden'}>${esc(guardada)}</div>
            </article>`;
    }

    function blocoNota(materiaNome, assuntoNome) {
        const chave = chaveNota(materiaNome, assuntoNome);
        const conceito = linhaConceito(cartoesDoAssunto(materiaNome, assuntoNome));
        return `
            <section class="ce-nota-bloco">
                <h3 class="ce-nota-titulo">${esc(materiaNome || 'Geral')} · ${esc(assuntoNome || 'Geral')}</h3>
                ${conceito ? `<p class="ce-nota-conceito">${esc(conceito)}</p>` : ''}
                <textarea class="ce-nota" data-chave="${esc(chave)}" rows="3" placeholder="Suas anotações sobre este assunto" aria-label="Suas anotações sobre ${esc(assuntoNome || 'este assunto')}">${esc(lerNotas()[chave] || '')}</textarea>
            </section>`;
    }

    // Na aba Superadas, cada assunto ganha seu bloco de anotação antes das questões dele
    function listaComNotas(pagina) {
        let html = '', atual = null;
        pagina.forEach((i) => {
            const k = chaveNota(i.q.materia, i.q.assunto);
            if (k !== atual) { atual = k; html += blocoNota(i.q.materia, i.q.assunto); }
            html += cartao(i);
        });
        return html;
    }

    function desenhar() {
        const todosDoEstado = itens.filter((i) => i.estado === estado);
        const por = contar(itens);
        sub.textContent = itens.length ? `${por.abertas} para refazer · ${por.superadas} ${por.superadas === 1 ? 'superada' : 'superadas'}` : '';
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
                (estado === 'superadas'
                    ? listaComNotas([...lista.slice(0, mostrando)].sort((a, b) => chaveNota(a.q.materia, a.q.assunto).localeCompare(chaveNota(b.q.materia, b.q.assunto), 'pt-BR')))
                    : lista.slice(0, mostrando).map(cartao).join('')) +
                (lista.length > mostrando ? `<button type="button" class="ce-mais" data-ce="mais">Mostrar mais (${lista.length - mostrando})</button>` : '');
        }
        textoUso();
    }

    el.addEventListener('input', (e) => {
        if (e.target.classList.contains('ce-nota')) { gravarNota(e.target.dataset.chave, e.target.value); return; }
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
        if (acao === 'resposta') {
            const caixa = art.querySelector('.ce-resp');
            if (!caixa.hidden) { caixa.hidden = true; return; }
            if (caixa.dataset.pronta) { caixa.hidden = false; return; }
            if (emUso.has('r' + art.dataset.id) || !pedirGabarito) return;
            emUso.add('r' + art.dataset.id);
            alvo.disabled = true;
            let r;
            try { r = await pedirGabarito(item.q, item.h.letraErrada || ''); } catch (err) { r = { ok: false }; }
            emUso.delete('r' + art.dataset.id);
            alvo.disabled = false;
            if (r && r.ok && r.gabarito) {
                const certa = String(r.gabarito).toUpperCase();
                const marcou = item.h.letraErrada ? `Você marcou: ${esc(item.h.letraErrada)}${textoDaAlternativa(item.q, item.h.letraErrada) ? ' (' + esc(textoDaAlternativa(item.q, item.h.letraErrada)) + ')' : ''}<br>` : '';
                const txtCerta = textoDaAlternativa(item.q, certa);
                const expl = item.q.explicacao || item.q.comentario || item.q.justificativa || '';
                caixa.innerHTML = `${marcou}<strong>Resposta certa: ${esc(certa)}${txtCerta ? ' (' + esc(txtCerta) + ')' : ''}</strong>` +
                    (expl ? `<br><br>${esc(expl)}` : '<br><br><em>Esta questão não tem comentário.</em>');
                caixa.dataset.pronta = '1';
            } else {
                caixa.textContent = (r && r.message) || 'Não consegui buscar a resposta agora. Ela precisa de internet ou do pacote offline baixado.';
            }
            caixa.hidden = false;
            return;
        }
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
