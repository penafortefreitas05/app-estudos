// ============================================================
// js/simulado-tela.js - Simulado em página inteira (FocoPro)
// ============================================================
// Decidido com o Nathan em 05/11/2026. Três telas no mesmo estilo do Aprender e do Caderno de erros:
//   1. abrirSimulado: montar o simulado (questões, tempo, opções) + histórico dos simulados feitos;
//   2. abrirResultado: nota, tempo, acerto por matéria e atalhos (refazer erros, Caderno);
//   3. o simulado em si segue sendo a lista de questões da página principal (js/simulado.js).
// Os campos do painel antigo seguem escondidos no HTML e valendo: esta tela só os preenche.

import { esc } from './ui.js';

const CHAVE_SIMULADOS = 'appEstudos_Simulados';
const CHAVE_CONFIG = 'appEstudos_SimuladoConfig';
const PAGINA = 8;

export const OPCOES_QTD = [10, 20, 40, 60];
export const OPCOES_EXTRA = [
    ['equilibrar', '⚖️ Equilibrar matérias', 'Sorteia um pouco de cada matéria'],
    ['somenteNovas', '🆕 Só questões novas', 'Nada que você já respondeu'],
    ['priorizarErros', '🎯 Priorizar meus erros', 'Começa pelo que você errou ou vence na revisão']
];

// ---------- Regras puras ----------
export const percentual = (r) => (r && r.total ? Math.round((r.acertos * 100) / r.total) : 0);

export function tempoSugerido(qtd) { return Math.max(5, Math.round((qtd * 2.5) / 5) * 5); }

export function resumirSimulados(lista) {
    const l = Array.isArray(lista) ? lista : [];
    if (!l.length) return { feitos: 0, media: 0, melhor: 0, tendencia: [] };
    const pcts = l.map(percentual);
    return {
        feitos: l.length,
        media: Math.round(pcts.reduce((s, n) => s + n, 0) / pcts.length),
        melhor: Math.max(...pcts),
        tendencia: l.slice(0, 8).map(percentual).reverse() // do mais antigo ao mais novo
    };
}

// Linhas por matéria, da que precisa de mais reforço para a melhor
export function linhasPorMateria(porMateria) {
    return Object.entries(porMateria || {})
        .map(([materia, v]) => ({ materia, total: v.t, acertos: v.a, pct: v.t ? Math.round((v.a * 100) / v.t) : 0 }))
        .sort((x, y) => x.pct - y.pct || y.total - x.total);
}

export const formatarDuracao = (seg) => {
    const s = Math.max(0, Math.round(seg || 0));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return h ? `${h}h${String(m).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
};
const dataCurta = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; };

// ---------- Guardado no aparelho ----------
function ler(chave, padrao) { try { const v = JSON.parse(localStorage.getItem(chave)); return v ?? padrao; } catch (e) { return padrao; } }
function gravar(chave, v) { try { localStorage.setItem(chave, JSON.stringify(v)); } catch (e) { /* segue sem guardar */ } }

export const lerSimuladosLocais = () => ler(CHAVE_SIMULADOS, []);
export function guardarSimuladoLocal(reg) {
    const todos = lerSimuladosLocais().filter(r => r.id !== reg.id);
    todos.unshift(reg);
    gravar(CHAVE_SIMULADOS, todos.slice(0, 100));
}
// Junta o que está no aparelho com o que veio da nuvem (mesmo id = mesmo simulado), do mais novo ao mais antigo
export function mesclarSimulados(locais, nuvem) {
    const mapa = new Map();
    [...(nuvem || []), ...(locais || [])].forEach(r => { if (r && r.id && !mapa.has(r.id)) mapa.set(r.id, r); });
    return [...mapa.values()].sort((a, b) => String(b.em).localeCompare(String(a.em)));
}

export function novoId() {
    try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* cai no fallback */ }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });
}

// ---------- Tela de montar + histórico ----------
// opcoes.disponiveis(): quantas questões os filtros atuais deixam
// opcoes.aoComecar({ qtd, tempo, equilibrar, somenteNovas, priorizarErros })
// opcoes.aoFiltros(): abre a tela de filtros (esta fecha e reabre quando os filtros fecharem)
// opcoes.carregarHistorico(): Promise<lista> (aparelho + nuvem)
export function abrirSimulado({ disponiveis = () => 0, aoComecar, aoFiltros, carregarHistorico } = {}) {
    if (document.querySelector('.sm-tela')) return;
    const cfg = { qtd: 20, tempo: 'sem', equilibrar: true, somenteNovas: false, priorizarErros: false, ...ler(CHAVE_CONFIG, {}) };
    if (!OPCOES_QTD.includes(cfg.qtd)) cfg.qtd = 20;
    let historico = lerSimuladosLocais();
    let mostrando = PAGINA;
    let aberto = null;
    const focoAntes = document.activeElement;

    const el = document.createElement('div');
    el.className = 'sm-tela';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'sm-titulo');
    el.innerHTML = `
        <header class="sm-topo">
            <div><h2 id="sm-titulo" class="sm-titulo">⏱️ Simulado</h2><p class="sm-sub"></p></div>
            <button type="button" class="sm-sair" data-sm="fechar" aria-label="Fechar o simulado">✕</button>
        </header>
        <div class="sm-corpo"></div>`;
    document.body.appendChild(el);
    document.body.classList.add('modo-simulado-tela');
    const corpo = el.querySelector('.sm-corpo');

    const fechar = () => {
        document.removeEventListener('keydown', aoTeclar, true);
        el.remove();
        document.body.classList.remove('modo-simulado-tela');
        if (focoAntes && focoAntes.focus) focoAntes.focus();
    };
    const aoTeclar = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(); } };
    document.addEventListener('keydown', aoTeclar, true);

    const minutos = () => (cfg.tempo === 'sem' ? 0 : cfg.tempo === 'sug' ? tempoSugerido(cfg.qtd) : Number(cfg.tempo));
    const chip = (grupo, valor, texto, ativo) => `<button type="button" class="sm-chip${ativo ? ' ativo' : ''}" data-sm="${grupo}" data-v="${valor}" aria-pressed="${ativo}">${texto}</button>`;

    function desenhar() {
        const total = disponiveis();
        const real = Math.min(cfg.qtd, total);
        const r = resumirSimulados(historico);
        el.querySelector('.sm-sub').textContent = r.feitos ? `${r.feitos} ${r.feitos === 1 ? 'simulado feito' : 'simulados feitos'} · média ${r.media}%` : 'Monte um simulado com os seus filtros';
        const tendencia = r.tendencia.length > 1
            ? `<div class="sm-tendencia" aria-label="Evolução dos últimos simulados">${r.tendencia.map(p => `<i style="height:${Math.max(6, p)}%" title="${p}%"></i>`).join('')}</div>` : '';
        const lista = historico.slice(0, mostrando);
        corpo.innerHTML = `
            <section class="sm-sec">
                <h3 class="sm-sec-titulo">Quantas questões</h3>
                <div class="sm-chips sm-g4">${OPCOES_QTD.map(n => chip('qtd', n, n, cfg.qtd === n)).join('')}</div>
                <h3 class="sm-sec-titulo">Tempo</h3>
                <div class="sm-chips sm-g2">
                    ${chip('tempo', 'sem', 'Sem tempo', cfg.tempo === 'sem')}
                    ${chip('tempo', 'sug', `Sugerido · ${tempoSugerido(cfg.qtd)} min`, cfg.tempo === 'sug')}
                    ${chip('tempo', 60, '60 min', String(cfg.tempo) === '60')}
                    ${chip('tempo', 120, '120 min', String(cfg.tempo) === '120')}
                </div>
                <h3 class="sm-sec-titulo">Como sortear</h3>
                <div class="sm-opcoes">${OPCOES_EXTRA.map(([k, nome, det]) => `
                    <button type="button" class="sm-opcao${cfg[k] ? ' ativo' : ''}" data-sm="extra" data-v="${k}" aria-pressed="${cfg[k]}"><span class="sm-opcao-nome">${nome}</span><span class="sm-opcao-det">${det}</span><span class="sm-opcao-marca" aria-hidden="true">${cfg[k] ? '✓' : ''}</span></button>`).join('')}</div>
                <p class="sm-filtros">Usa os filtros atuais: <b>${total}</b> ${total === 1 ? 'questão disponível' : 'questões disponíveis'}.
                    <button type="button" class="sm-link" data-sm="filtros">Mudar filtros</button></p>
                <button type="button" class="sm-comecar" data-sm="comecar" ${real ? '' : 'disabled'}>${real ? `▶ Começar simulado (${real} ${real === 1 ? 'questão' : 'questões'}${minutos() ? ` · ${minutos()} min` : ''})` : 'Nenhuma questão com esses filtros'}</button>
                <p class="sm-aviso">Sem internet, o simulado funciona se você tiver baixado o pacote offline (menu ☰).</p>
            </section>
            <section class="sm-sec">
                <h3 class="sm-sec-titulo">Seus simulados</h3>
                ${r.feitos ? `<div class="sm-stats">
                    <div><b>${r.feitos}</b><span>feitos</span></div><div><b>${r.media}%</b><span>média</span></div><div><b>${r.melhor}%</b><span>melhor</span></div></div>${tendencia}` : '<p class="sm-vazio">Quando você finalizar um simulado, ele aparece aqui com a nota e o tempo.</p>'}
                <div class="sm-historico">${lista.map(item).join('')}</div>
                ${historico.length > mostrando ? `<button type="button" class="sm-mais" data-sm="mais">Mostrar mais (${historico.length - mostrando})</button>` : ''}
            </section>`;
    }

    function item(r) {
        const aberta = aberto === r.id;
        const p = percentual(r);
        return `<article class="sm-item${aberta ? ' aberto' : ''}">
            <button type="button" class="sm-item-topo" data-sm="item" data-v="${esc(r.id)}" aria-expanded="${aberta}">
                <span class="sm-item-data">${dataCurta(r.em)}</span>
                <span class="sm-item-nota"><b>${r.acertos}/${r.total}</b> · ${p}%</span>
                <span class="sm-item-tempo">${formatarDuracao(r.segundos)}${r.porTempo ? ' ⏰' : ''}</span>
            </button>
            ${aberta ? `<div class="sm-item-det">${linhasPorMateria(r.porMateria).map(l => `<div class="sm-linha"><span class="sm-linha-nome">${esc(l.materia)}</span><span class="sm-linha-barra"><i style="width:${l.pct}%"></i></span><span class="sm-linha-n">${l.acertos}/${l.total}</span></div>`).join('') || '<p class="sm-vazio">Sem detalhe por matéria.</p>'}</div>` : ''}
        </article>`;
    }

    el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-sm]');
        if (!b) return;
        const a = b.dataset.sm, v = b.dataset.v;
        if (a === 'fechar') return fechar();
        if (a === 'qtd') { cfg.qtd = Number(v); gravar(CHAVE_CONFIG, cfg); return desenhar(); }
        if (a === 'tempo') { cfg.tempo = v; gravar(CHAVE_CONFIG, cfg); return desenhar(); }
        if (a === 'extra') { cfg[v] = !cfg[v]; gravar(CHAVE_CONFIG, cfg); return desenhar(); }
        if (a === 'mais') { mostrando += PAGINA; return desenhar(); }
        if (a === 'item') { aberto = aberto === v ? null : v; return desenhar(); }
        if (a === 'filtros') { fechar(); if (aoFiltros) aoFiltros(); return; }
        if (a === 'comecar') {
            const dados = { qtd: cfg.qtd, tempo: minutos(), equilibrar: cfg.equilibrar, somenteNovas: cfg.somenteNovas, priorizarErros: cfg.priorizarErros };
            fechar();
            if (aoComecar) aoComecar(dados);
        }
    });

    desenhar();
    const sair = el.querySelector('.sm-sair');
    if (sair) sair.focus();
    // Histórico completo (aparelho + nuvem) chega depois, sem travar a tela
    if (typeof carregarHistorico === 'function') {
        carregarHistorico().then((l) => { if (Array.isArray(l) && document.body.contains(el)) { historico = l; desenhar(); } }).catch(() => {});
    }
}

// ---------- Tela do resultado ----------
// resultado: { total, acertos, brancos, segundos, porTempo, porMateria, erradas: [ids], semGabarito }
// anteriores: simulados já guardados antes deste (para comparar com a média)
// opcoes: { aoRefazer(ids), aoCaderno(), aoNovo() }
export function abrirResultado(resultado, anteriores = [], { aoRefazer, aoCaderno, aoNovo } = {}) {
    if (document.querySelector('.sm-tela')) document.querySelector('.sm-tela').remove();
    const p = percentual(resultado);
    const antes = resumirSimulados(anteriores);
    const comparacao = antes.feitos
        ? (p === antes.media ? `Igual à sua média (${antes.media}%).` : `${p > antes.media ? '+' : ''}${p - antes.media} ${Math.abs(p - antes.media) === 1 ? 'ponto' : 'pontos'} em relação à sua média (${antes.media}%).`) : 'Seu primeiro simulado registrado.';
    const linhas = linhasPorMateria(resultado.porMateria);
    const refazer = resultado.erradas || [];
    const focoAntes = document.activeElement;

    const el = document.createElement('div');
    el.className = 'sm-tela';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'sm-titulo');
    el.innerHTML = `
        <header class="sm-topo">
            <div><h2 id="sm-titulo" class="sm-titulo">🏁 Resultado</h2><p class="sm-sub">${resultado.porTempo ? 'Tempo esgotado' : 'Simulado finalizado'}</p></div>
            <button type="button" class="sm-sair" data-sm="fechar" aria-label="Fechar o resultado">✕</button>
        </header>
        <div class="sm-corpo">
            <section class="sm-sec">
                <div class="sm-nota"><b>${resultado.acertos}/${resultado.total}</b><span>${p}%</span></div>
                <p class="sm-comp">${esc(comparacao)}</p>
                <div class="sm-stats"><div><b>${formatarDuracao(resultado.segundos)}</b><span>tempo</span></div><div><b>${resultado.total - resultado.acertos - (resultado.brancos || 0)}</b><span>erros</span></div><div><b>${resultado.brancos || 0}</b><span>em branco</span></div></div>
                ${resultado.semGabarito ? `<p class="sm-aviso">${resultado.semGabarito} questão(ões) sem gabarito ficaram fora da correção.</p>` : ''}
            </section>
            <section class="sm-sec">
                <h3 class="sm-sec-titulo">Por matéria <span class="sm-dica">as mais fracas primeiro</span></h3>
                ${linhas.map(l => `<div class="sm-linha"><span class="sm-linha-nome">${esc(l.materia)}${l.pct < 60 && l.total >= 2 ? ' ⚠️' : ''}</span><span class="sm-linha-barra"><i style="width:${l.pct}%"></i></span><span class="sm-linha-n">${l.acertos}/${l.total}</span></div>`).join('')}
            </section>
            <section class="sm-sec sm-acoes">
                <button type="button" class="sm-comecar" data-sm="correcao">Ver a correção, questão a questão</button>
                ${refazer.length ? `<button type="button" class="sm-sec-btn" data-sm="refazer">Refazer o que errei no Foco (${refazer.length})</button>` : ''}
                <button type="button" class="sm-sec-btn" data-sm="caderno">📕 Abrir o Caderno de erros</button>
                <button type="button" class="sm-sec-btn" data-sm="novo">Novo simulado</button>
            </section>
        </div>`;
    document.body.appendChild(el);
    document.body.classList.add('modo-simulado-tela');
    const fechar = () => {
        document.removeEventListener('keydown', aoTeclar, true);
        el.remove();
        document.body.classList.remove('modo-simulado-tela');
        if (focoAntes && focoAntes.focus) focoAntes.focus();
    };
    const aoTeclar = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(); } };
    document.addEventListener('keydown', aoTeclar, true);
    el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-sm]');
        if (!b) return;
        const a = b.dataset.sm;
        if (a === 'fechar' || a === 'correcao') return fechar();
        fechar();
        if (a === 'refazer' && aoRefazer) aoRefazer(refazer);
        if (a === 'caderno' && aoCaderno) aoCaderno();
        if (a === 'novo' && aoNovo) aoNovo();
    });
    const sair = el.querySelector('.sm-comecar');
    if (sair) sair.focus();
}
