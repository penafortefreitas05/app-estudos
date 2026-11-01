// ============================================================
// js/leitura.js - Aprender 2.0: modo leitura (FocoPro)
// ============================================================
// Decidido em 01/11/2026: o Aprender não tem perguntas. A pessoa lê um cartão por tela e marca
// "Entendi" ou "Ainda não". Nada vai para o histórico de respostas nem para a barra de acerto.
//   - Cartões: data/aprender-cartoes.json (formato em claude/aprender-2-0.md no Project).
//   - "Entendi" fica guardado no aparelho (localStorage), pelo id do cartão.
//   - "Ainda não" manda o cartão para o fim da fila: ele volta depois dos outros.
// Piloto: abre só pelo bloco "Novo · modo leitura" da escolha do Aprender. A trilha antiga
// (exemplo resolvido + prova) continua igual para todos os assuntos.

import { esc } from './ui.js';

const ARQUIVO_CARTOES = './data/aprender-cartoes.json';
const CHAVE_ENTENDIDOS = 'appEstudos_Aprender2Entendidos';
const NOMES_NIVEL = { 1: 'Iniciante', 2: 'Intermediário', 3: 'Avançado', 4: 'Especialista' };

// ---------- Dados ----------
let cartoesPorAssunto = null; // Map "materia|assunto" -> cartões, na ordem do arquivo

async function carregarCartoes() {
    if (cartoesPorAssunto) return cartoesPorAssunto;
    try {
        const resp = await fetch(ARQUIVO_CARTOES);
        const lista = resp.ok ? await resp.json() : [];
        const mapa = new Map();
        (Array.isArray(lista) ? lista : []).forEach(c => {
            if (!c || !c.id || !c.materia || !c.assunto) return;
            const chave = `${c.materia}|${c.assunto}`;
            if (!mapa.has(chave)) mapa.set(chave, []);
            mapa.get(chave).push(c);
        });
        cartoesPorAssunto = mapa;
    } catch (e) {
        return new Map(); // sem internet ou arquivo ausente: tenta de novo na próxima vez
    }
    return cartoesPorAssunto;
}

// Assuntos que já têm cartões novos: [{ materia, assunto, cartoes }]
export async function assuntosComCartoes() {
    const mapa = await carregarCartoes();
    return [...mapa.values()].map(cartoes => ({ materia: cartoes[0].materia, assunto: cartoes[0].assunto, cartoes }));
}

// ---------- "Entendi" guardado no aparelho ----------
export function lerEntendidos() {
    try {
        const v = JSON.parse(localStorage.getItem(CHAVE_ENTENDIDOS) || '{}');
        return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    } catch (e) {
        return {};
    }
}

function marcarEntendido(id) {
    const v = lerEntendidos();
    v[id] = new Date().toISOString().slice(0, 10);
    try { localStorage.setItem(CHAVE_ENTENDIDOS, JSON.stringify(v)); } catch (e) { /* segue sem guardar */ }
}

export function contarEntendidos(cartoes, entendidos = lerEntendidos()) {
    return cartoes.filter(c => entendidos[c.id]).length;
}

// ---------- Fila da sessão (regras puras, testáveis sem tela) ----------
export function novaSessao(cartoes) {
    return { fila: cartoes.map(c => c.id), entendidos: new Set(), adiados: new Set() };
}

// "entendi" tira o cartão atual da fila; qualquer outra ação ("ainda") manda para o fim.
export function avancar(sessao, acao) {
    const [atual, ...resto] = sessao.fila;
    if (atual === undefined) return sessao;
    const entendidos = new Set(sessao.entendidos);
    const adiados = new Set(sessao.adiados);
    if (acao === 'entendi') {
        entendidos.add(atual);
        return { fila: resto, entendidos, adiados };
    }
    adiados.add(atual);
    return { fila: [...resto, atual], entendidos, adiados };
}

// ---------- Tela ----------
// Separa o exemplo do resumo ("... Exemplo: ..." ou "... Ex.: ...") para dar destaque à frase central
function dividirExemplo(texto) {
    const t = String(texto || '');
    const m = t.match(/\s(Exemplo:|Ex\.:)/);
    return m ? [t.slice(0, m.index), t.slice(m.index + 1)] : [t, ''];
}

function cartaoHTML(c) {
    const [central, exemplo] = dividirExemplo(c.resumo);
    const pares = Array.isArray(c.nao_confundir) ? c.nao_confundir.filter(p => p && p.conceito) : [];
    const termo = String(c.termo_ingles || '').trim();
    return `
        <article class="leitura-cartao">
            <p class="leitura-meta">${esc(c.materia)} · ${esc(NOMES_NIVEL[c.nivel] || 'Iniciante')}</p>
            <h3 class="leitura-conceito" tabindex="-1">${esc(c.conceito)}</h3>
            ${termo ? `<p class="leitura-termo"><span class="leitura-en">EN</span><strong lang="en">${esc(termo)}</strong><span class="leitura-traducao">→ ${esc(c.traducao || '')}</span></p>` : ''}
            <p class="leitura-resumo">${esc(central)}</p>
            ${exemplo ? `<p class="leitura-exemplo">${esc(exemplo)}</p>` : ''}
            ${pares.length ? `<section class="leitura-bloco"><h4>🔀 Não confundir</h4><ul>${pares.map(p =>
                `<li><strong>${esc(p.conceito)}</strong>: ${esc(p.diferenca || '')}</li>`).join('')}</ul></section>` : ''}
            ${c.atencao ? `<section class="leitura-bloco atencao"><h4>⚠️ Atenção</h4><p>${esc(c.atencao)}</p></section>` : ''}
            ${c.fonte ? `<p class="leitura-fonte">Fonte: ${esc(c.fonte)}</p>` : ''}
        </article>`;
}

// Abre a leitura de um assunto. Só um por vez.
export function abrirLeitura(cartoes, { titulo, aoFechar } = {}) {
    if (!Array.isArray(cartoes) || !cartoes.length || document.querySelector('.leitura')) return;
    const porId = new Map(cartoes.map(c => [c.id, c]));
    const assunto = titulo || cartoes[0].assunto;
    let sessao = novaSessao(cartoes);
    const jaEraAprender = document.body.classList.contains('modo-aprender');
    const focoAntes = document.activeElement;

    const el = document.createElement('div');
    el.className = 'leitura';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'leitura-titulo');
    el.innerHTML = `
        <header class="leitura-topo">
            <div>
                <p class="leitura-faixa">📖 Aprender · leitura</p>
                <h2 id="leitura-titulo" class="leitura-titulo">${esc(assunto)}</h2>
            </div>
            <button type="button" class="leitura-sair" data-acao="fechar" aria-label="Sair da leitura">✕</button>
        </header>
        <div class="leitura-bolas" aria-hidden="true"></div>
        <p class="leitura-contagem" aria-live="polite"></p>
        <div class="leitura-corpo"></div>
        <div class="leitura-acoes"></div>
        <p class="leitura-atalhos">Teclado: E = Entendi · A = Ainda não · Esc = sair</p>`;
    const bolas = el.querySelector('.leitura-bolas');
    const contagem = el.querySelector('.leitura-contagem');
    const corpo = el.querySelector('.leitura-corpo');
    const acoes = el.querySelector('.leitura-acoes');

    function desenhar() {
        const atual = sessao.fila[0];
        bolas.innerHTML = cartoes.map(c => {
            const classes = ['leitura-bola'];
            if (sessao.entendidos.has(c.id)) classes.push('feita');
            else if (sessao.adiados.has(c.id)) classes.push('adiada');
            if (c.id === atual) classes.push('atual');
            return `<i class="${classes.join(' ')}"></i>`;
        }).join('');
        contagem.textContent = `${sessao.entendidos.size} de ${cartoes.length} entendidos`;

        if (atual === undefined) {
            corpo.innerHTML = `
                <div class="leitura-fim">
                    <p class="leitura-fim-icone" aria-hidden="true">✓</p>
                    <h3 class="leitura-conceito" tabindex="-1">Você leu os ${cartoes.length} cartões</h3>
                    <p>${esc(assunto)}: todos marcados como entendidos.</p>
                    <p class="leitura-fim-dica">Para fixar, pratique as questões desse assunto no Testar.</p>
                </div>`;
            acoes.innerHTML = `
                <button type="button" class="leitura-btn ainda" data-acao="denovo">Ler de novo</button>
                <button type="button" class="leitura-btn entendi" data-acao="fechar">Fechar</button>`;
        } else {
            const voltou = sessao.adiados.has(atual)
                ? '<p class="leitura-volta">Este cartão voltou. Leia com calma; se quiser, saia e volte outro dia.</p>' : '';
            corpo.innerHTML = voltou + cartaoHTML(porId.get(atual));
            acoes.innerHTML = `
                <button type="button" class="leitura-btn ainda" data-acao="ainda">Ainda não</button>
                <button type="button" class="leitura-btn entendi" data-acao="entendi">Entendi ✓</button>`;
        }
        corpo.scrollTop = 0;
        const titulo = corpo.querySelector('.leitura-conceito');
        if (titulo) titulo.focus({ preventScroll: true });
    }

    function agir(acao) {
        if (acao === 'fechar') return fechar();
        if (acao === 'denovo') { sessao = novaSessao(cartoes); return desenhar(); }
        if (sessao.fila[0] === undefined) return;
        if (acao === 'entendi') marcarEntendido(sessao.fila[0]);
        sessao = avancar(sessao, acao);
        desenhar();
    }

    // Captura: os atalhos do app (busca "/", letras do Modo Foco) não podem agir por trás da leitura
    function aoTeclar(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const tecla = e.key.toLowerCase();
        if (e.key === 'Tab') {
            const focaveis = [...el.querySelectorAll('button')];
            if (!focaveis.length) return;
            const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
            if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
            else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
            else if (!el.contains(document.activeElement)) { e.preventDefault(); primeiro.focus(); }
            return;
        }
        e.stopPropagation();
        if (e.key === 'Escape') { e.preventDefault(); agir('fechar'); }
        else if (tecla === 'e' && sessao.fila.length) { e.preventDefault(); agir('entendi'); }
        else if (tecla === 'a' && sessao.fila.length) { e.preventDefault(); agir('ainda'); }
    }

    let fechada = false;
    function fechar() {
        if (fechada) return;
        fechada = true;
        document.removeEventListener('keydown', aoTeclar, true);
        el.classList.remove('visivel');
        if (!jaEraAprender) document.body.classList.remove('modo-aprender');
        setTimeout(() => el.remove(), 180);
        if (focoAntes && typeof focoAntes.focus === 'function' && document.contains(focoAntes)) focoAntes.focus({ preventScroll: true });
        if (typeof aoFechar === 'function') aoFechar();
    }

    el.addEventListener('click', (e) => {
        const botao = e.target.closest('[data-acao]');
        if (botao) agir(botao.dataset.acao);
    });
    document.addEventListener('keydown', aoTeclar, true);
    document.body.classList.add('modo-aprender');
    document.body.appendChild(el);
    desenhar();
    requestAnimationFrame(() => el.classList.add('visivel'));
}
