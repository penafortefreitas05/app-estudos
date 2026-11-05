// ============================================================
// js/seletor-assunto.js - Seletor de assunto com busca (FocoPro)
// ============================================================
// O <select> de assunto fica escondido e continua sendo a fonte da verdade (o resto do app lê e grava
// nele). No lugar aparece um botão que abre uma lista com busca, agrupada por matéria; assuntos com
// poucas questões ficam recolhidos em "Mostrar mais". Escolher um item grava no <select> e dispara "change".

import { esc } from './ui.js';

export const LIMITE_ASSUNTO_PEQUENO = 3; // assuntos com até 3 questões vão para "Mostrar mais"

const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Lê as opções do <select> como grupos: [{ rotulo, itens: [{ valor, n }] }]
export function lerGrupos(select) {
    const itemDe = o => ({ valor: o.value, n: Number(o.dataset.n) || 0 });
    const grupos = [];
    const soltos = [];
    [...select.children].forEach(no => {
        if (no.tagName === 'OPTGROUP') grupos.push({ rotulo: no.label, itens: [...no.children].map(itemDe) });
        else if (no.tagName === 'OPTION' && no.value) soltos.push(itemDe(no));
    });
    return soltos.length ? [{ rotulo: '', itens: soltos }, ...grupos] : grupos;
}

// Separa os itens de um grupo em principais e pequenos; com busca, tudo que casar aparece junto
export function filtrarGrupos(grupos, busca, expandido = false) {
    const termo = semAcento(busca).trim();
    return grupos.map(g => {
        const casam = g.itens.filter(i => !termo || semAcento(i.valor).includes(termo));
        if (termo || expandido) return { rotulo: g.rotulo, principais: casam, pequenos: [] };
        return {
            rotulo: g.rotulo,
            principais: casam.filter(i => i.n > LIMITE_ASSUNTO_PEQUENO || !i.n),
            pequenos: casam.filter(i => i.n && i.n <= LIMITE_ASSUNTO_PEQUENO)
        };
    }).filter(g => g.principais.length || g.pequenos.length);
}

export function ligarSeletorAssunto(select) {
    if (!select || select.dataset.seletorLigado) return { sincronizar() {} };
    select.dataset.seletorLigado = '1';

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'sa-botao input-dark';
    botao.setAttribute('aria-haspopup', 'dialog');
    select.insertAdjacentElement('afterend', botao);
    select.classList.add('sa-escondido');
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;

    const textoPadrao = () => (select.options[0] && select.options[0].textContent) || '🏷️ Todos os Assuntos';
    function sincronizar() {
        const sel = select.selectedIndex > 0 ? select.options[select.selectedIndex] : null;
        botao.textContent = sel ? `🏷️ ${sel.textContent}` : textoPadrao();
        botao.classList.toggle('ativo', Boolean(sel));
    }

    // Quem muda select.value por código (definirTag, limpar filtros) também atualiza o botão
    const desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    Object.defineProperty(select, 'value', {
        configurable: true,
        get() { return desc.get.call(this); },
        set(v) { desc.set.call(this, v); sincronizar(); }
    });
    new MutationObserver(sincronizar).observe(select, { childList: true, subtree: true });
    sincronizar();

    function abrir() {
        if (document.querySelector('.sa-overlay')) return;
        const grupos = lerGrupos(select);
        const atual = select.value;
        let busca = '';
        let expandido = false;
        const focoAntes = document.activeElement;

        const el = document.createElement('div');
        el.className = 'sa-overlay';
        el.innerHTML = `
            <div class="sa-folha" role="dialog" aria-modal="true" aria-label="Escolher assunto">
                <div class="sa-topo">
                    <input type="search" class="sa-busca" placeholder="Buscar assunto..." aria-label="Buscar assunto" autocomplete="off" enterkeyhint="search">
                    <button type="button" class="sa-fechar" data-sa="fechar" aria-label="Fechar">✕</button>
                </div>
                <div class="sa-lista"></div>
            </div>`;
        const lista = el.querySelector('.sa-lista');

        function desenhar() {
            const vis = filtrarGrupos(grupos, busca, expandido);
            const item = i => `<button type="button" class="sa-item${i.valor === atual ? ' atual' : ''}" data-valor="${esc(i.valor)}">${esc(i.valor)}</button>`;
            const totalPequenos = vis.reduce((n, g) => n + g.pequenos.length, 0);
            lista.innerHTML =
                `<button type="button" class="sa-item todos${atual ? '' : ' atual'}" data-valor="">${esc(textoPadrao())}</button>` +
                vis.filter(g => g.principais.length).map(g => `${g.rotulo ? `<p class="sa-grupo">${esc(g.rotulo)}</p>` : ''}${g.principais.map(item).join('')}`).join('') +
                (!vis.some(g => g.principais.length) && !totalPequenos ? '<p class="sa-vazio">Nenhum assunto com esse texto.</p>' : '') +
                (totalPequenos ? `<button type="button" class="sa-mais" data-sa="mais">Mostrar mais ${totalPequenos} assuntos pequenos</button>` : '');
        }
        let fechado = false;
        function fechar() {
            if (fechado) return;
            fechado = true;
            document.removeEventListener('keydown', aoTeclar, true);
            el.remove();
            if (focoAntes && typeof focoAntes.focus === 'function' && document.contains(focoAntes)) focoAntes.focus({ preventScroll: true });
        }
        function aoTeclar(e) {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(); }
        }
        el.addEventListener('click', (e) => {
            if (e.target === el) return fechar();
            const b = e.target.closest('button');
            if (!b) return;
            if (b.dataset.sa === 'fechar') return fechar();
            if (b.dataset.sa === 'mais') { expandido = true; return desenhar(); }
            if (b.dataset.valor !== undefined) {
                const mudou = select.value !== b.dataset.valor;
                select.value = b.dataset.valor;
                fechar();
                if (mudou) select.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        el.querySelector('.sa-busca').addEventListener('input', (e) => { busca = e.target.value; desenhar(); });
        document.addEventListener('keydown', aoTeclar, true);
        document.body.appendChild(el);
        desenhar();
        el.querySelector('.sa-busca').focus({ preventScroll: true });
    }
    botao.addEventListener('click', abrir);
    return { sincronizar };
}
