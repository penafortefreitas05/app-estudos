// ============================================================
// js/icones.js - ícones de traço (SVG) do FocoPro
// ============================================================
// Decidido em 12/11/2026 (v152): os emojis da interface viram desenhos de traço, que ficam iguais em
// qualquer celular e seguem a cor do texto (currentColor). Formato dos botões: pílula.
// Uso: icone('alvo') devolve o <svg> como texto; no HTML, <span data-icone="alvo"></span> é preenchido por aplicarIcones().

const D = {
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    fogo: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    repetir: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    refazer: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
    livro: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    feito: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    alerta: '<path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    busca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    filtros: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    niveis: '<path d="M5 20v-4M10 20v-8M15 20V8M20 20V4"/>',
    estrela: '<path d="m12 3 2.8 5.6 6.2.9-4.5 4.4 1 6.1-5.5-2.9-5.5 2.9 1-6.1L3 9.5l6.2-.9z"/>',
    calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    fechar: '<path d="M18 6 6 18M6 6l12 12"/>',
    play: '<path d="M7 4v16l13-8z" fill="currentColor"/>',
    ciclo: '<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>',
    certo: '<path d="m5 12 5 5 9-10"/>',
    olho: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    ia: '<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/>',
    grade: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    grafico: '<path d="M3 3v18h18"/><path d="M8 16v-4M13 16V8M18 16v-7"/>',
    caderno: '<path d="M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2z"/><path d="M5 17a2 2 0 0 1 2-2h12M9 7h6"/>',
    relogio: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
    baixar: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    pilha: '<path d="M4 19V6a2 2 0 0 1 2-2h12v15"/><path d="M4 19a2 2 0 0 0 2 2h12v-4H6a2 2 0 0 0-2 2z"/>'
};

export function icone(nome, classe = '') {
    const d = D[nome];
    if (!d) return '';
    return `<svg class="ic${classe ? ' ' + classe : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
}

// Preenche os <span data-icone="nome"> que ainda estão vazios (cores via classes ic-azul, ic-laranja...)
export function aplicarIcones(raiz = document) {
    raiz.querySelectorAll('[data-icone]').forEach((el) => {
        if (el.firstElementChild) return;
        el.innerHTML = icone(el.dataset.icone, el.dataset.cor ? 'ic-' + el.dataset.cor : '');
    });
}
