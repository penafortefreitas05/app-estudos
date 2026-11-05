// ============================================================
// js/filtros-tela.js - Tela de filtros (FocoPro)
// ============================================================
// Decidido em 05/11/2026: "Mais filtros" deixa de ser um painel com 4 listas nativas e vira uma tela,
// no mesmo jeito do Aprender: matéria → assunto (com busca), banca e ano em botões, sem números.
// Os <select> do painel antigo continuam no HTML (escondidos) e são a fonte da verdade: esta tela só
// lê e grava neles e dispara "change", então toda a lógica de filtragem do app segue igual.
// A contagem por matéria, assunto e banca fica na Cobertura do edital.

import { esc } from './ui.js';
import { lerGrupos, filtrarGrupos } from './seletor-assunto.js';

// Opções de um <select> como [{ valor, rotulo }], sem a opção "Todos" e sem as escondidas
export function opcoesDe(select) {
    if (!select) return [];
    return [...select.options]
        .filter(o => o.value && !o.hidden && !o.disabled)
        .map(o => ({ valor: o.value, rotulo: o.textContent.replace(/^🎯\s*Concurso:\s*/, '').trim() }));
}

// opcoes.selects: { concurso, materia, banca, ano, tag } (elementos <select>)
// opcoes.contagem(): texto da contagem atual (ex.: "123 questões")
// opcoes.aoLimpar(): limpa tudo (clica no "Limpar filtros" existente)
export function abrirFiltros({ selects, contagem = () => '', aoLimpar } = {}) {
    if (document.querySelector('.ft-tela') || !selects) return;
    const { concurso, materia, banca, ano, tag } = selects;
    let buscaAssunto = '';
    let expandido = false;
    const focoAntes = document.activeElement;

    const el = document.createElement('div');
    el.className = 'ft-tela';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'ft-titulo');
    el.innerHTML = `
        <header class="ft-topo">
            <div>
                <h2 id="ft-titulo" class="ft-titulo">🎛️ Filtros</h2>
                <p class="ft-sub" aria-live="polite"></p>
            </div>
            <button type="button" class="ft-sair" data-ft="fechar" aria-label="Fechar os filtros">✕</button>
        </header>
        <div class="ft-corpo">
            <div class="ft-grade">
                <div class="ft-col">
                    <section class="ft-sec ft-sec-concurso"></section>
                    <section class="ft-sec ft-sec-materia"></section>
                    <section class="ft-sec ft-sec-banca"></section>
                    <section class="ft-sec ft-sec-ano"></section>
                </div>
                <div class="ft-col">
                    <section class="ft-sec ft-sec-assunto"></section>
                </div>
            </div>
        </div>
        <footer class="ft-rodape">
            <button type="button" class="ft-limpar" data-ft="limpar">Limpar tudo</button>
            <button type="button" class="ft-ver" data-ft="fechar"></button>
        </footer>`;
    const q = s => el.querySelector(s);

    function bloco(titulo, select, rotuloTodos, colunas = 2) {
        const ops = opcoesDe(select);
        if (!ops.length) return '';
        const atual = select.value;
        return `<h3 class="ft-sec-titulo">${titulo}</h3>
            <div class="ft-chips ft-grade ft-g${colunas}" role="group" aria-label="${esc(titulo)}">
                ${rotuloTodos ? `<button type="button" class="ft-chip todos${atual ? '' : ' ativo'}" data-campo="${select.id}" data-valor="" aria-pressed="${!atual}">${rotuloTodos}</button>` : ''}
                ${ops.map(o => `<button type="button" class="ft-chip${o.valor === atual ? ' ativo' : ''}" data-campo="${select.id}" data-valor="${esc(o.valor)}" aria-pressed="${o.valor === atual}">${esc(o.rotulo)}</button>`).join('')}
            </div>`;
    }

    function desenharAssunto() {
        const grupos = lerGrupos(tag);
        const vis = filtrarGrupos(grupos, buscaAssunto, expandido);
        const atual = tag.value;
        const item = i => `<button type="button" class="ft-assunto${i.valor === atual ? ' ativo' : ''}" data-campo="${tag.id}" data-valor="${esc(i.valor)}">${esc(i.valor)}</button>`;
        const pequenos = vis.reduce((n, g) => n + g.pequenos.length, 0);
        const dica = materia && materia.value ? `em ${esc(materia.value)}` : 'em todas as matérias';
        q('.ft-sec-assunto').innerHTML = `
            <h3 class="ft-sec-titulo">Assunto <span class="ft-dica">${dica}</span></h3>
            <input type="search" class="ft-busca" placeholder="Buscar assunto..." aria-label="Buscar assunto" autocomplete="off" enterkeyhint="search" value="${esc(buscaAssunto)}">
            <div class="ft-lista-assunto">
                <button type="button" class="ft-assunto todos${atual ? '' : ' ativo'}" data-campo="${tag.id}" data-valor="">Todos os assuntos</button>
                ${vis.filter(g => g.principais.length).map(g => `${g.rotulo ? `<p class="ft-grupo">${esc(g.rotulo)}</p>` : ''}${g.principais.map(item).join('')}`).join('')}
                ${!vis.some(g => g.principais.length) && !pequenos ? '<p class="ft-vazio">Nenhum assunto com esse texto.</p>' : ''}
                ${pequenos ? `<button type="button" class="ft-mais" data-ft="mais">Mostrar mais ${pequenos} ${pequenos === 1 ? "assunto pequeno" : "assuntos pequenos"}</button>` : ''}
            </div>`;
    }

    function desenhar(manterBusca = false) {
        q('.ft-sub').textContent = contagem();
        q('.ft-ver').textContent = `Ver ${contagem() || 'questões'}`;
        q('.ft-sec-concurso').innerHTML = concurso && !concurso.hidden ? bloco('Concurso', concurso, null) : '';
        q('.ft-sec-materia').innerHTML = bloco('Matéria', materia, 'Todas');
        q('.ft-sec-banca').innerHTML = bloco('Banca', banca, 'Todas', 3);
        q('.ft-sec-ano').innerHTML = ano && !ano.hidden ? bloco('Ano', ano, 'Todos', 3) : '';
        if (!manterBusca) desenharAssunto();
    }

    function aplicar(campoId, valor) {
        const select = document.getElementById(campoId);
        if (!select || select.value === valor) return;
        select.value = valor;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        if (campoId === materia.id) { buscaAssunto = ''; expandido = false; }
        desenhar(campoId === tag.id);
        if (campoId === tag.id) desenharAssunto();
    }

    let fechada = false;
    function fechar() {
        if (fechada) return;
        fechada = true;
        document.removeEventListener('keydown', aoTeclar, true);
        el.classList.remove('visivel');
        document.body.classList.remove('ft-aberta');
        setTimeout(() => el.remove(), 180);
        if (focoAntes && typeof focoAntes.focus === 'function' && document.contains(focoAntes)) focoAntes.focus({ preventScroll: true });
    }
    function aoTeclar(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(); }
    }

    el.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.ft === 'fechar') return fechar();
        if (b.dataset.ft === 'limpar') { if (typeof aoLimpar === 'function') aoLimpar(); buscaAssunto = ''; expandido = false; return desenhar(); }
        if (b.dataset.ft === 'mais') { expandido = true; return desenharAssunto(); }
        if (b.dataset.campo !== undefined) aplicar(b.dataset.campo, b.dataset.valor);
    });
    el.addEventListener('input', (e) => {
        if (!e.target.classList.contains('ft-busca')) return;
        buscaAssunto = e.target.value;
        const pos = e.target.selectionStart;
        desenharAssunto();
        const novo = q('.ft-busca');
        novo.focus({ preventScroll: true });
        novo.setSelectionRange(pos, pos);
    });
    document.addEventListener('keydown', aoTeclar, true);
    document.body.classList.add('ft-aberta');
    document.body.appendChild(el);
    desenhar();
    requestAnimationFrame(() => el.classList.add('visivel'));
    const primeiro = q('.ft-chip.ativo') || q('.ft-sair');
    if (primeiro) primeiro.focus({ preventScroll: true });
}
