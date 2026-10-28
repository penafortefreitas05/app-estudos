// ============================================================
// js/primeiros-passos.js - Primeira sessão do usuário (FocoPro)
// ============================================================
// Pacote "Primeira sessão" da Análise da primeira experiência (28/10/2026):
//   B. Boas-vindas em 3 perguntas (alvo, quanto já sabe de TI, meta diária) + por onde começar
//   D. Dicas que aparecem uma vez só, na hora em que fazem sentido
//   Q. Meta diária com progresso ("4 de 10")
// O perfil fica neste aparelho por enquanto (uma tabela "perfis" na nuvem vem depois),
// guardado por usuário: duas contas no mesmo navegador não se misturam.
// A sessão guiada (C) é montada em app.js, que conhece as questões e o Modo Foco.

import { diaLocal } from './storage.js';

const CHAVE_PERFIS = 'appEstudos_Perfis';
const CHAVE_DICAS = 'appEstudos_DicasVistas';
const CHAVE_META_AVISADA = 'appEstudos_MetaAvisadaEm';

export const OPCOES_ALVO = [
    { valor: 'tribunais', texto: 'Tribunais' },
    { valor: 'bacen-tcu', texto: 'Bacen / TCU' },
    { valor: 'legislativo', texto: 'Senado / Câmara' },
    { valor: 'indefinido', texto: 'Ainda não sei' }
];
export const OPCOES_EXPERIENCIA = [
    { valor: 'comecando', texto: 'Estou começando', detalhe: 'Começo pelo nível Iniciante' },
    { valor: 'um-pouco', texto: 'Sei um pouco', detalhe: 'Iniciante primeiro, depois prova' },
    { valor: 'trabalho', texto: 'Já trabalho na área', detalhe: 'Todos os níveis misturados' }
];
export const OPCOES_META = [5, 10, 20];

// Escapa texto para HTML (cópia local do esc() de ui.js, para este módulo não depender dele:
// ui.js importa daqui, e o contrário criaria um import circular)
function esc(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function lerJSON(chave, padrao) {
    try {
        const v = JSON.parse(localStorage.getItem(chave) || 'null');
        return v && typeof v === 'object' ? v : padrao;
    } catch (e) {
        return padrao;
    }
}

function gravarJSON(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* sem localStorage: vale só nesta aba */ }
}

// ---------- Perfil ----------
// Perfil ativo: usado pela meta (ui.js) e pela ordem das questões (app.js)
let perfilAtivo = null;

export function carregarPerfil(uid) {
    if (!uid) return (perfilAtivo = null);
    const todos = lerJSON(CHAVE_PERFIS, {});
    perfilAtivo = todos[uid] || null;
    return perfilAtivo;
}

export function salvarPerfil(uid, perfil) {
    if (!uid) return;
    const todos = lerJSON(CHAVE_PERFIS, {});
    todos[uid] = { ...perfil, atualizadoEm: Date.now() };
    gravarJSON(CHAVE_PERFIS, todos);
    perfilAtivo = todos[uid];
}

export function obterPerfilAtivo() {
    return perfilAtivo;
}

// ---------- Meta diária (Q) ----------
// Conta as questões DIFERENTES respondidas hoje (refazer a mesma não soma de novo).
// Vem do histórico, que já sincroniza com a nuvem: a meta bate igual no celular e no computador.
export function contarRespondidasHoje(historico) {
    const hoje = diaLocal();
    return Object.values(historico || {}).filter(h => h && h.ultimaData && diaLocal(h.ultimaData) === hoje).length;
}

// Atualiza a barra da meta (menu lateral) e o "4/10" do placar do celular.
// Devolve { feitas, meta, batida } ou null quando não há meta definida.
export function atualizarMetaNaTela(historico) {
    const meta = perfilAtivo && Number(perfilAtivo.meta);
    const caixa = document.getElementById('meta-hoje');
    const mini = document.getElementById('mini-meta');
    if (!meta) {
        if (caixa) caixa.hidden = true;
        if (mini) mini.hidden = true;
        return null;
    }
    const feitas = contarRespondidasHoje(historico);
    const batida = feitas >= meta;
    const pct = Math.min(100, Math.round((feitas / meta) * 100));
    if (caixa) {
        caixa.hidden = false;
        caixa.classList.toggle('batida', batida);
        const valor = document.getElementById('meta-hoje-valor');
        const fill = document.getElementById('meta-hoje-fill');
        if (valor) valor.textContent = batida ? `${feitas} de ${meta} ✓` : `${feitas} de ${meta}`;
        if (fill) fill.style.width = `${pct}%`;
    }
    if (mini) {
        mini.hidden = false;
        mini.textContent = `${Math.min(feitas, meta)}/${meta}`;
        mini.classList.toggle('batida', batida);
    }
    return { feitas, meta, batida };
}

// true só na primeira vez do dia em que a meta é batida (para o aviso não repetir)
export function metaBatidaAgora(estado) {
    if (!estado || !estado.batida) return false;
    const hoje = diaLocal();
    let avisada = null;
    try { avisada = localStorage.getItem(CHAVE_META_AVISADA); } catch (e) { /* segue */ }
    if (avisada === hoje) return false;
    try { localStorage.setItem(CHAVE_META_AVISADA, hoje); } catch (e) { /* segue */ }
    return true;
}

// ---------- Dicas que aparecem uma vez (D) ----------
export const DICAS = {
    'antes-de-responder': {
        titulo: 'Como responder',
        texto: 'Escolha a alternativa e diga se tem certeza. Se chutou, use “Na dúvida”: a questão volta amanhã para você confirmar. Errar aqui faz parte do método: é lendo a explicação depois do erro que se aprende.'
    },
    'primeiro-erro': {
        titulo: 'Errou? Ela volta amanhã',
        texto: 'As questões que você erra aparecem amanhã em “Revisar hoje”, e depois em 3, 7 e 21 dias. Leia a explicação abaixo da questão. Se ainda ficar dúvida, toque em “Entender meu erro com IA”.'
    },
    'primeira-duvida': {
        titulo: 'Acertou na dúvida',
        texto: 'Ainda não conta como sabida. Ela volta amanhã para você confirmar, e só vira “Dominada” quando você acertar com certeza em dias diferentes.'
    },
    'tres-numeros': {
        titulo: 'Seus 3 números',
        texto: '🔥 Dias: dias seguidos estudando (1 folga por semana não zera). 🗺️ Feitas: quanto do app você já respondeu. ⚠️ Reforçar: matérias abaixo de 60% de acerto. No celular, eles ficam no menu ☰.'
    }
};

function dicasVistas() {
    return lerJSON(CHAVE_DICAS, {});
}

// Quem já usava o app antes deste pacote não precisa das dicas de iniciante
export function marcarTodasDicasComoVistas() {
    const vistas = dicasVistas();
    Object.keys(DICAS).forEach(k => { vistas[k] = vistas[k] || Date.now(); });
    gravarJSON(CHAVE_DICAS, vistas);
}

export function dicasJaForamDecididas() {
    try { return localStorage.getItem(CHAVE_DICAS) !== null; } catch (e) { return true; }
}

const filaDicas = [];
let dicaNaTela = null;

// Mostra a dica (uma por vez; as outras esperam). Devolve false se ela já foi vista.
export function mostrarDica(chave) {
    const dica = DICAS[chave];
    if (!dica || dicasVistas()[chave] || filaDicas.includes(chave) || (dicaNaTela && dicaNaTela.dataset.chave === chave)) return false;
    filaDicas.push(chave);
    if (!dicaNaTela) proximaDica();
    return true;
}

function proximaDica() {
    const chave = filaDicas.shift();
    if (!chave) { dicaNaTela = null; return; }
    const dica = DICAS[chave];
    const caixa = document.createElement('aside');
    caixa.className = 'dica-card';
    caixa.dataset.chave = chave;
    caixa.setAttribute('role', 'status');
    caixa.innerHTML = `
        <p class="dica-titulo">💡 ${esc(dica.titulo)}</p>
        <p class="dica-texto">${esc(dica.texto)}</p>
        <button type="button" class="btn-primary dica-ok">Entendi</button>`;
    caixa.querySelector('.dica-ok').addEventListener('click', () => {
        const vistas = dicasVistas();
        vistas[chave] = Date.now();
        gravarJSON(CHAVE_DICAS, vistas);
        caixa.classList.remove('visivel');
        setTimeout(() => { caixa.remove(); proximaDica(); }, 180);
    });
    document.body.appendChild(caixa);
    dicaNaTela = caixa;
    requestAnimationFrame(() => caixa.classList.add('visivel'));
}

// ---------- Boas-vindas em 3 perguntas + por onde começar (B) ----------
// materias: [{ nome, disponiveis }] para o passo 4 (vazio = não pergunta)
// perfilAtual: valores já escolhidos (quando aberto por "Meta diária e perfil")
// onConcluir({ perfil, materia }) — materia null quando pulou ou não há passo 4
export function abrirBoasVindas({ materias = [], perfilAtual = null, onConcluir }) {
    const escolhas = {
        alvo: perfilAtual?.alvo || null,
        experiencia: perfilAtual?.experiencia || null,
        meta: perfilAtual?.meta || null
    };
    const passos = ['alvo', 'experiencia', 'meta'];
    if (materias.length) passos.push('materia');
    let passo = 0;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay boas-vindas';
    overlay.innerHTML = `<div class="modal-card boas-vindas-card" role="dialog" aria-modal="true" aria-labelledby="bv-titulo"></div>`;
    const card = overlay.firstElementChild;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));

    const fechar = (materia) => {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.remove(), 200);
        const perfil = {
            alvo: escolhas.alvo || 'indefinido',
            experiencia: escolhas.experiencia || 'comecando',
            meta: escolhas.meta || 10
        };
        onConcluir && onConcluir({ perfil, materia: materia || null });
    };

    const opcao = (grupo, valor, texto, detalhe = '') => {
        const marcada = String(escolhas[grupo]) === String(valor);
        return `<button type="button" class="bv-opcao${marcada ? ' marcada' : ''}" data-grupo="${grupo}" data-valor="${esc(valor)}" aria-pressed="${marcada}">
            <span class="bv-opcao-texto">${esc(texto)}</span>${detalhe ? `<span class="bv-opcao-detalhe">${esc(detalhe)}</span>` : ''}</button>`;
    };

    const desenhar = () => {
        const atual = passos[passo];
        const progresso = `<p class="bv-progresso">${passo + 1} de ${passos.length}</p>`;
        let corpo = '';
        if (atual === 'alvo') {
            corpo = `<h3 id="bv-titulo" class="modal-titulo">Qual é o seu alvo?</h3>
                <p class="modal-mensagem">Fica no seu perfil. Em breve, o app usa para priorizar o que cai na sua prova.</p>
                <div class="bv-opcoes">${OPCOES_ALVO.map(o => opcao('alvo', o.valor, o.texto)).join('')}</div>`;
        } else if (atual === 'experiencia') {
            corpo = `<h3 id="bv-titulo" class="modal-titulo">Quanto você já sabe de TI?</h3>
                <p class="modal-mensagem">Decide por qual nível de questão você começa.</p>
                <div class="bv-opcoes">${OPCOES_EXPERIENCIA.map(o => opcao('experiencia', o.valor, o.texto, o.detalhe)).join('')}</div>`;
        } else if (atual === 'meta') {
            corpo = `<h3 id="bv-titulo" class="modal-titulo">Quantas questões por dia?</h3>
                <p class="modal-mensagem">Comece pequeno: constância vale mais que volume. Dá para mudar depois.</p>
                <div class="bv-opcoes bv-opcoes-linha">${OPCOES_META.map(n => opcao('meta', n, `${n} questões`)).join('')}</div>`;
        } else {
            corpo = `<h3 id="bv-titulo" class="modal-titulo">Por onde começar?</h3>
                <p class="modal-mensagem">Uma primeira sessão de 10 questões, uma por vez, em 2 assuntos da matéria.</p>
                <div class="bv-opcoes">${materias.map((m, i) => `
                    <button type="button" class="bv-opcao bv-materia" data-materia="${esc(m.nome)}">
                        <span class="bv-opcao-texto">${esc(m.nome)}</span>
                        <span class="bv-opcao-detalhe">${i === 0 ? 'Recomendada para começar · ' : ''}${m.disponiveis} questões de Iniciante</span>
                    </button>`).join('')}</div>`;
        }
        const ultimo = passo === passos.length - 1;
        const podeAvancar = atual === 'materia' || escolhas[atual] !== null;
        card.innerHTML = `${progresso}${corpo}
            <div class="modal-acoes bv-acoes">
                <button type="button" class="btn-link bv-pular">${atual === 'materia' ? 'Agora não' : 'Pular'}</button>
                ${passo > 0 ? '<button type="button" class="btn-secondary bv-voltar">Voltar</button>' : ''}
                ${atual === 'materia' ? '' : `<button type="button" class="btn-primary bv-avancar" ${podeAvancar ? '' : 'disabled'}>${ultimo ? 'Concluir' : 'Continuar'}</button>`}
            </div>`;
        const foco = card.querySelector('.bv-opcao.marcada') || card.querySelector('.bv-opcao');
        if (foco) foco.focus({ preventScroll: true });
    };

    card.addEventListener('click', (e) => {
        const op = e.target.closest('.bv-opcao[data-grupo]');
        if (op) {
            const v = op.dataset.valor;
            escolhas[op.dataset.grupo] = op.dataset.grupo === 'meta' ? Number(v) : v;
            desenhar();
            return;
        }
        const mat = e.target.closest('.bv-materia');
        if (mat) { fechar(mat.dataset.materia); return; }
        if (e.target.closest('.bv-voltar')) { passo = Math.max(0, passo - 1); desenhar(); return; }
        if (e.target.closest('.bv-avancar')) {
            if (passo === passos.length - 1) fechar(null);
            else { passo++; desenhar(); }
            return;
        }
        if (e.target.closest('.bv-pular')) fechar(null);
    });

    desenhar();
}
