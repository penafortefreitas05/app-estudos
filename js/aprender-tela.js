// ============================================================
// js/aprender-tela.js - Tela do Aprender: matérias → assuntos (FocoPro)
// ============================================================
// Decidido em 05/11/2026: o Aprender deixa de ser uma janela com lista única e passa a ser uma tela:
//   - "Continuar" no topo (último assunto aberto, ou o próximo ainda não feito);
//   - matérias com barra de progresso (cartões entendidos);
//   - assuntos da matéria escolhida, na ordem em que ensinam, com filtro (Todos, Não vistos,
//     Em andamento, Entendidos) e busca.
// Celular: duas vistas (matérias → assuntos, com botão voltar). Computador (>= 900px): duas colunas.
// O "Entendi" continua guardado no aparelho por js/leitura.js; esta tela só lê esse estado.

import { esc } from './ui.js';
import { assuntosComCartoes, abrirLeitura, lerEntendidos, contarEntendidos } from './leitura.js';

const CHAVE_ULTIMO = 'appEstudos_AprenderUltimo';

export const FILTROS = [
    ['todos', 'Todos'],
    ['novos', 'Não vistos'],
    ['andamento', 'Em andamento'],
    ['feitos', 'Entendidos']
];

// ---------- Regras puras (testáveis sem tela) ----------

// Estado de um assunto: novos (0 entendidos), andamento (alguns) ou feitos (todos)
export function estadoDe(cartoes, entendidos = {}) {
    const feitos = contarEntendidos(cartoes, entendidos);
    const total = cartoes.length;
    return { feitos, total, estado: feitos === 0 ? 'novos' : (feitos >= total ? 'feitos' : 'andamento') };
}

// Agrupa [{materia, assunto, cartoes}] por matéria. Matérias na ordem dada (as demais, em ordem alfabética);
// assuntos na ordem em que aparecem no arquivo de cartões (a ordem didática dos lotes).
export function agruparPorMateria(lista, ordemMaterias = []) {
    const mapa = new Map();
    lista.forEach(a => {
        if (!mapa.has(a.materia)) mapa.set(a.materia, []);
        mapa.get(a.materia).push(a);
    });
    const extras = [...mapa.keys()].filter(m => !ordemMaterias.includes(m)).sort((x, y) => x.localeCompare(y, 'pt-BR'));
    return [...ordemMaterias.filter(m => mapa.has(m)), ...extras].map(materia => ({ materia, assuntos: mapa.get(materia) }));
}

// Progresso de uma matéria em cartões e em assuntos
export function progressoDaMateria(assuntos, entendidos = {}) {
    let cartoes = 0, feitosCartoes = 0, assuntosFeitos = 0;
    assuntos.forEach(a => {
        const e = estadoDe(a.cartoes, entendidos);
        cartoes += e.total;
        feitosCartoes += e.feitos;
        if (e.estado === 'feitos') assuntosFeitos += 1;
    });
    return { cartoes, feitosCartoes, assuntos: assuntos.length, assuntosFeitos };
}

// O que o botão "Continuar" oferece: { materia, assunto, tipo } ou null quando tudo está entendido
//   continuar: o último assunto aberto ainda não terminou
//   proximo:   o último terminou; vai para o próximo da matéria (ou o primeiro pendente de qualquer matéria)
//   comecar:   nunca abriu nada
export function escolherContinuar(grupos, ultimo, entendidos = {}) {
    const pendente = a => estadoDe(a.cartoes, entendidos).estado !== 'feitos';
    const achado = (materia, assunto) => {
        const g = grupos.find(x => x.materia === materia);
        const i = g ? g.assuntos.findIndex(a => a.assunto === assunto) : -1;
        return i >= 0 ? { g, i } : null;
    };
    const ref = ultimo ? achado(ultimo.materia, ultimo.assunto) : null;
    if (ref) {
        if (pendente(ref.g.assuntos[ref.i])) return { materia: ultimo.materia, assunto: ultimo.assunto, tipo: 'continuar' };
        const depois = ref.g.assuntos.slice(ref.i + 1).find(pendente);
        if (depois) return { materia: depois.materia, assunto: depois.assunto, tipo: 'proximo' };
    }
    for (const g of grupos) {
        const a = g.assuntos.find(pendente);
        if (a) return { materia: g.materia, assunto: a.assunto, tipo: ref ? 'proximo' : 'comecar' };
    }
    return null;
}

const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Filtra os assuntos de uma matéria por situação e por texto
export function filtrarAssuntos(assuntos, filtro, busca, entendidos = {}) {
    const termo = semAcento(busca).trim();
    return assuntos.filter(a => {
        if (filtro !== 'todos' && estadoDe(a.cartoes, entendidos).estado !== filtro) return false;
        return !termo || semAcento(a.assunto).includes(termo);
    });
}

function lerUltimo() {
    try {
        const v = JSON.parse(localStorage.getItem(CHAVE_ULTIMO) || 'null');
        return v && v.materia && v.assunto ? v : null;
    } catch (e) { return null; }
}

function guardarUltimo(materia, assunto) {
    try { localStorage.setItem(CHAVE_ULTIMO, JSON.stringify({ materia, assunto })); } catch (e) { /* segue sem guardar */ }
}

// ---------- Tela ----------

// opcoes.ordemMaterias: ordem das matérias na lista
// opcoes.temQuestoes(materia, assunto): se true, a leitura mostra "Praticar" no fim
// opcoes.aoPraticar(materia, assunto): chamado depois de fechar leitura e tela
// opcoes.materia: matéria já escolhida ao abrir (ex.: primeira sessão guiada)
// Devolve false quando não há cartões carregados (ex.: sem internet na primeira vez).
export async function abrirAprender({ ordemMaterias = [], temQuestoes = () => false, aoPraticar, materia: materiaInicial } = {}) {
    if (document.querySelector('.aprender-tela')) return true;
    const lista = await assuntosComCartoes();
    if (!lista.length) return false;
    const grupos = agruparPorMateria(lista, ordemMaterias);

    const ultimo = lerUltimo();
    let materia = null;
    let vista = 'materias';
    const inicial = materiaInicial || (ultimo && ultimo.materia);
    if (grupos.some(g => g.materia === materiaInicial)) { materia = materiaInicial; vista = 'assuntos'; }
    else materia = grupos.some(g => g.materia === inicial) ? inicial : grupos[0].materia;
    let filtro = 'todos';
    let busca = '';

    const focoAntes = document.activeElement;
    const el = document.createElement('div');
    el.className = 'aprender-tela';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'at-titulo');
    el.innerHTML = `
        <header class="at-topo">
            <div>
                <h2 id="at-titulo" class="at-titulo">📖 Aprender</h2>
                <p class="at-sub"></p>
            </div>
            <button type="button" class="at-sair" data-acao="fechar" aria-label="Fechar o Aprender">✕</button>
        </header>
        <div class="at-corpo">
            <div class="at-continuar-area"></div>
            <div class="at-grade">
                <nav class="at-materias" aria-label="Matérias"></nav>
                <section class="at-assuntos" aria-label="Assuntos da matéria">
                    <div class="at-assuntos-topo">
                        <button type="button" class="at-voltar" data-acao="voltar">← Matérias</button>
                        <h3 class="at-materia-nome"></h3>
                        <p class="at-materia-prog"></p>
                    </div>
                    <div class="at-ferramentas">
                        <input type="search" class="at-busca" placeholder="Buscar assunto..." aria-label="Buscar assunto" autocomplete="off" enterkeyhint="search">
                        <div class="at-chips" role="group" aria-label="Filtrar assuntos"></div>
                    </div>
                    <ul class="at-lista"></ul>
                </section>
            </div>
        </div>`;
    const q = sel => el.querySelector(sel);

    function barra(feitos, total) {
        const pct = total ? Math.round(feitos * 100 / total) : 0;
        return `<span class="at-barra" aria-hidden="true"><i style="width:${pct}%"></i></span>`;
    }

    function desenharTopo(entendidos) {
        const total = lista.reduce((n, a) => n + a.cartoes.length, 0);
        const feitos = lista.reduce((n, a) => n + contarEntendidos(a.cartoes, entendidos), 0);
        q('.at-sub').textContent = `${feitos} de ${total} cartões entendidos · ${lista.length} assuntos`;
        const c = escolherContinuar(grupos, lerUltimo(), entendidos);
        const area = q('.at-continuar-area');
        if (!c) {
            area.innerHTML = '<p class="at-tudo">🎉 Você marcou todos os cartões como entendidos. Use "Ler de novo" em qualquer assunto para revisar.</p>';
            return;
        }
        const a = lista.find(x => x.materia === c.materia && x.assunto === c.assunto);
        const e = estadoDe(a.cartoes, entendidos);
        const rotulo = c.tipo === 'continuar' ? 'Continuar' : (c.tipo === 'proximo' ? 'Próximo' : 'Começar');
        area.innerHTML = `
            <button type="button" class="at-continuar" data-acao="continuar" data-materia="${esc(c.materia)}" data-assunto="${esc(c.assunto)}">
                <span class="at-continuar-rotulo">${rotulo}</span>
                <span class="at-continuar-nome">${esc(c.assunto)}</span>
                <span class="at-continuar-det">${esc(c.materia)} · ${e.feitos} de ${e.total} entendidos</span>
            </button>`;
    }

    function desenharMaterias(entendidos) {
        q('.at-materias').innerHTML = grupos.map(g => {
            const p = progressoDaMateria(g.assuntos, entendidos);
            const ativa = g.materia === materia;
            return `<button type="button" class="at-materia${ativa ? ' ativa' : ''}" data-acao="materia" data-materia="${esc(g.materia)}" aria-current="${ativa ? 'true' : 'false'}">
                <span class="at-materia-texto">${esc(g.materia)}</span>
                ${barra(p.feitosCartoes, p.cartoes)}
                <span class="at-materia-det">${p.assuntosFeitos} de ${p.assuntos} assuntos · ${p.feitosCartoes}/${p.cartoes} cartões</span>
            </button>`;
        }).join('');
    }

    function desenharLista(entendidos) {
        const grupo = grupos.find(g => g.materia === materia) || grupos[0];
        const p = progressoDaMateria(grupo.assuntos, entendidos);
        q('.at-materia-nome').textContent = grupo.materia;
        q('.at-materia-prog').textContent = `${p.assuntosFeitos} de ${p.assuntos} assuntos entendidos`;
        const contagem = { todos: grupo.assuntos.length, novos: 0, andamento: 0, feitos: 0 };
        grupo.assuntos.forEach(a => { contagem[estadoDe(a.cartoes, entendidos).estado] += 1; });
        q('.at-chips').innerHTML = FILTROS.map(([id, nome]) =>
            `<button type="button" class="at-chip${id === filtro ? ' ativo' : ''}" data-acao="filtro" data-filtro="${id}" aria-pressed="${id === filtro}">${nome} <span>${contagem[id]}</span></button>`).join('');
        const visiveis = filtrarAssuntos(grupo.assuntos, filtro, busca, entendidos);
        q('.at-lista').innerHTML = visiveis.length ? visiveis.map(a => {
            const e = estadoDe(a.cartoes, entendidos);
            const icone = e.estado === 'feitos' ? '✓' : (e.estado === 'andamento' ? '◐' : '○');
            return `<li><button type="button" class="at-assunto ${e.estado}" data-acao="assunto" data-materia="${esc(a.materia)}" data-assunto="${esc(a.assunto)}">
                <span class="at-assunto-icone" aria-hidden="true">${icone}</span>
                <span class="at-assunto-texto"><span class="at-assunto-nome">${esc(a.assunto)}</span>
                <span class="at-assunto-det">${e.feitos} de ${e.total} entendidos</span></span>
                ${barra(e.feitos, e.total)}
            </button></li>`;
        }).join('') : `<li class="at-vazio">${busca.trim() ? 'Nenhum assunto com esse texto.' : 'Nenhum assunto neste filtro.'}</li>`;
    }

    function desenhar() {
        const entendidos = lerEntendidos();
        el.dataset.vista = vista;
        desenharTopo(entendidos);
        desenharMaterias(entendidos);
        desenharLista(entendidos);
    }

    function abrirAssunto(mat, nome) {
        const a = lista.find(x => x.materia === mat && x.assunto === nome);
        if (!a) return;
        guardarUltimo(mat, nome);
        materia = mat;
        abrirLeitura(a.cartoes, {
            titulo: a.assunto,
            aoFechar: () => { if (!fechada) desenhar(); },
            aoPraticar: temQuestoes(mat, nome) && typeof aoPraticar === 'function'
                ? () => { fechar(); aoPraticar(mat, nome); }
                : undefined
        });
    }

    function agir(botao) {
        const d = botao.dataset;
        switch (d.acao) {
            case 'fechar': return fechar();
            case 'voltar': vista = 'materias'; return desenhar();
            case 'materia':
                materia = d.materia; vista = 'assuntos'; filtro = 'todos'; busca = '';
                q('.at-busca').value = '';
                desenhar();
                return q('.at-assuntos').scrollIntoView({ block: 'start' });
            case 'filtro': filtro = d.filtro; return desenharLista(lerEntendidos());
            case 'continuar':
            case 'assunto': return abrirAssunto(d.materia, d.assunto);
        }
    }

    function aoTeclar(e) {
        if (e.key !== 'Escape' || document.querySelector('.leitura')) return;
        e.preventDefault();
        if (vista === 'assuntos' && window.matchMedia('(max-width: 899px)').matches) { vista = 'materias'; desenhar(); }
        else fechar();
    }

    let fechada = false;
    function fechar() {
        if (fechada) return;
        fechada = true;
        document.removeEventListener('keydown', aoTeclar);
        el.classList.remove('visivel');
        document.body.classList.remove('modo-aprender');
        setTimeout(() => el.remove(), 180);
        if (focoAntes && typeof focoAntes.focus === 'function' && document.contains(focoAntes)) focoAntes.focus({ preventScroll: true });
    }

    el.addEventListener('click', (e) => {
        const botao = e.target.closest('[data-acao]');
        if (botao) agir(botao);
    });
    q('.at-busca').addEventListener('input', (e) => { busca = e.target.value; desenharLista(lerEntendidos()); });
    document.addEventListener('keydown', aoTeclar);

    document.body.classList.add('modo-aprender');
    document.body.appendChild(el);
    desenhar();
    requestAnimationFrame(() => el.classList.add('visivel'));
    const primeiro = q('.at-continuar') || q('.at-materia');
    if (primeiro) primeiro.focus({ preventScroll: true });
    return true;
}
