// ============================================================
// js/simulado-tela.js - Simulado em página inteira (FocoPro)
// ============================================================
// Decidido com o Nathan em 05/11/2026. Três telas no mesmo estilo do Aprender e do Caderno de erros:
//   1. abrirSimulado: montar o simulado (questões, tempo, opções) + histórico dos simulados feitos;
//   2. abrirResultado: nota, tempo, acerto por matéria e atalhos (refazer erros, Caderno);
//   3. o simulado em si segue sendo a lista de questões da página principal (js/simulado.js).
// Os campos do painel antigo seguem escondidos no HTML e valendo: esta tela só os preenche.

import { esc } from './ui.js';
import { icone } from './icones.js';

const CHAVE_SIMULADOS = 'appEstudos_Simulados';
const CHAVE_CONFIG = 'appEstudos_SimuladoConfig';
const PAGINA = 8;

export const OPCOES_QTD = [10, 20, 40, 60];
export const OPCOES_EXTRA = [
    ['equilibrar', `${icone('balanca')}Um pouco de cada matéria`, 'Sorteio parelho entre as matérias'],
    ['somenteNovas', `${icone('estrela')}Só questões novas`, 'Nada que você já respondeu'],
    ['priorizarErros', `${icone('alvo')}Priorizar meus erros`, 'Começa pelo que você errou ou vence na revisão']
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

// ---------- Marcas de confiança (v162) ----------
// Chaves curtas, para caber no jsonb "por_materia" da nuvem sem coluna nova:
// ac acerto com certeza · ad acerto na dúvida · as acerto sem marcação
// ec erro com certeza · ed erro na dúvida · es erro sem marcação · b em branco
export const MARCAS = [
    ['ec', 'Erro com certeza', 'mc-ec'],
    ['ed', 'Erro na dúvida', 'mc-ed'],
    ['es', 'Erro sem marcação', 'mc-sem'],
    ['ad', 'Acerto na dúvida', 'mc-ad'],
    ['as', 'Acerto sem marcação', 'mc-sem'],
    ['ac', 'Acerto com certeza', 'mc-ac'],
    ['b', 'Em branco', 'mc-sem']
];

export function chaveMarca({ temResposta, acertou, marca }) {
    if (!temResposta) return 'b';
    const m = marca === 'certeza' ? 'c' : marca === 'duvida' ? 'd' : 's';
    return (acertou ? 'a' : 'e') + m;
}

// porMateria[materia] = { t, a, m: {chave: n}, s: { [assunto]: { t, a, m } } }  (t e a como antes)
export function registrarMarca(porMateria, { materia, assunto, temResposta, acertou, marca }) {
    const k = chaveMarca({ temResposta, acertou, marca });
    const pm = porMateria[materia] || (porMateria[materia] = { t: 0, a: 0, m: {}, s: {} });
    if (!pm.m) pm.m = {};
    if (!pm.s) pm.s = {};
    const pa = pm.s[assunto] || (pm.s[assunto] = { t: 0, a: 0, m: {} });
    for (const alvo of [pm, pa]) {
        alvo.t++;
        if (temResposta && acertou) alvo.a++;
        alvo.m[k] = (alvo.m[k] || 0) + 1;
    }
    return k;
}

export function somarMarcas(porMateria) {
    const tot = {};
    Object.values(porMateria || {}).forEach(v => Object.entries((v && v.m) || {}).forEach(([k, n]) => { tot[k] = (tot[k] || 0) + n; }));
    return tot;
}

// Assuntos de uma matéria, do mais fraco (mais erros com certeza, menor acerto) ao melhor
export function linhasPorAssunto(v) {
    return Object.entries((v && v.s) || {})
        .map(([assunto, x]) => ({ assunto, total: x.t, acertos: x.a, m: x.m || {}, pct: x.t ? Math.round((x.a * 100) / x.t) : 0 }))
        .sort((x, y) => (y.m.ec || 0) - (x.m.ec || 0) || x.pct - y.pct || y.total - x.total);
}

// Quatro grupos (v163). "Sem marcação" entra na dúvida, como na fila de revisão.
export function grupos(m) {
    const x = m || {};
    return { ac: x.ac || 0, ad: (x.ad || 0) + (x.as || 0), ed: (x.ed || 0) + (x.es || 0), ec: x.ec || 0,
        sem: (x.as || 0) + (x.es || 0), b: x.b || 0 };
}
const n = (q, um, varios) => `${q} ${q === 1 ? um : varios}`;

// Uma linha de texto com o que pesa: erros com certeza (em vermelho), erros na dúvida e, se pedir, acertos na dúvida
export function resumoProblema(m, { comFragil = false } = {}) {
    const g = grupos(m);
    const partes = [];
    if (g.ec) partes.push(`<b class="sm-t-ec">${n(g.ec, 'erro com certeza', 'erros com certeza')}</b>`);
    if (g.ed) partes.push(n(g.ed, 'erro na dúvida', 'erros na dúvida'));
    if (comFragil && g.ad) partes.push(n(g.ad, 'acerto na dúvida', 'acertos na dúvida'));
    return partes.join(' · ');
}

// "Onde você foi pior": cada matéria com nota e uma linha de problema; os assuntos ficam recolhidos.
// Simulados antigos (sem m/s) mostram só nome e nota.
export function htmlPorMateria(porMateria) {
    return linhasPorMateria(porMateria).map(l => {
        const v = porMateria[l.materia] || {};
        const assuntos = linhasPorAssunto(v);
        const prob = v.m ? resumoProblema(v.m) : '';
        const cab = `<div class="sm-mat-cab"><span class="sm-mat-nome">${esc(l.materia)}</span><span class="sm-mat-n">${l.acertos}/${l.total}</span></div>
            ${prob ? `<p class="sm-mat-prob">${prob}</p>` : ''}`;
        if (!assuntos.length) return `<div class="sm-mat">${cab}</div>`;
        return `<details class="sm-mat">
            <summary>${cab}<span class="sm-mat-ver">Ver assuntos (${assuntos.length})</span></summary>
            <ul class="sm-assuntos">${assuntos.map(a => {
                const pa = resumoProblema(a.m, { comFragil: true });
                return `<li class="sm-ass"><span class="sm-ass-nome">${esc(a.assunto)}</span><span class="sm-ass-n">${a.acertos}/${a.total}</span>
                ${pa ? `<span class="sm-ass-prob">${pa}</span>` : ''}</li>`;
            }).join('')}</ul></details>`;
    }).join('');
}

// Os 4 números do coração da tela, na ordem dominado → frágil → lacuna → conceito errado
export function htmlResumoMarcas(porMateria) {
    const t = somarMarcas(porMateria);
    if (!Object.keys(t).length) return '';
    const g = grupos(t);
    const cel = (q, nome, sub, cls) => `<div class="sm-rm ${cls}"><b>${q}</b><span>${nome}</span><small>${sub}</small></div>`;
    return `<div class="sm-rmarcas">
        ${cel(g.ac, 'acerto com certeza', 'dominado', 'mc-ac')}${cel(g.ad, 'acerto na dúvida', 'frágil', 'mc-ad')}
        ${cel(g.ed, 'erro na dúvida', 'lacuna', 'mc-ed')}${cel(g.ec, 'erro com certeza', 'conceito errado', 'mc-ec')}</div>
        ${g.sem ? `<p class="sm-dica-sem">${n(g.sem, 'resposta sem marcação contada', 'respostas sem marcação contadas')} como dúvida.</p>` : ''}`;
}

// Comparação só com 3 simulados ou mais antes deste, em pontos percentuais
export function textoComparacao(p, anteriores) {
    const antes = resumirSimulados(anteriores);
    if (antes.feitos < 3) return '';
    const d = p - antes.media;
    if (d === 0) return `Igual à sua média de ${antes.feitos} simulados (${antes.media}%).`;
    return `${Math.abs(d)} ${Math.abs(d) === 1 ? 'ponto percentual' : 'pontos percentuais'} ${d > 0 ? 'acima' : 'abaixo'} da sua média de ${antes.feitos} simulados (${antes.media}%).`;
}

// Nota líquida das Certo/Errado: cada erro anula um acerto; branco não desconta
export function textoNotaLiquida(ce) {
    if (!ce || !ce.t) return '';
    const liq = (ce.a || 0) - (ce.e || 0);
    return `Nota líquida (Certo/Errado): <b>${liq}</b> de ${ce.t} <span class="sm-liq-conta">(${ce.a || 0} − ${ce.e || 0})</span>`;
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
// opcoes.modelo: { nome, quotas(qtd) } do concurso escolhido (padrão da prova) ou null
// opcoes.aoFiltros(): abre a tela de filtros (esta fecha e reabre quando os filtros fecharem)
// opcoes.carregarHistorico(): Promise<lista> (aparelho + nuvem)
export function abrirSimulado({ disponiveis = () => 0, aoComecar, aoFiltros, carregarHistorico, modelo = null } = {}) {
    if (document.querySelector('.sm-tela')) return;
    const cfg = { qtd: 20, tempo: 'sem', equilibrar: true, modelo: true, somenteNovas: false, priorizarErros: false, ...ler(CHAVE_CONFIG, {}) };
    if (![...OPCOES_QTD, 120].includes(cfg.qtd) || (cfg.qtd === 120 && !modelo)) cfg.qtd = 20;
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
            <div><h2 id="sm-titulo" class="sm-titulo">${icone("relogio", "ic-azul")}Simulado</h2><p class="sm-sub"></p></div>
            <button type="button" class="sm-sair" data-sm="fechar" aria-label="Fechar o simulado">${icone("fechar")}</button>
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

    const qtdReal = () => Math.max(1, Math.min(cfg.qtd, disponiveis() || cfg.qtd));
    const minutos = () => (cfg.tempo === 'sem' ? 0 : cfg.tempo === 'sug' ? tempoSugerido(qtdReal()) : Number(cfg.tempo));
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
                <div class="sm-chips sm-g4">${OPCOES_QTD.map(n => chip('qtd', n, n, cfg.qtd === n)).join('')}${modelo ? chip('qtd', 120, '120 · prova completa', cfg.qtd === 120).replace('class="sm-chip', 'class="sm-chip sm-larga') : ''}</div>
                <h3 class="sm-sec-titulo">Tempo</h3>
                <div class="sm-chips sm-g2">
                    ${chip('tempo', 'sem', 'Sem tempo', cfg.tempo === 'sem')}
                    ${chip('tempo', 'sug', `Sugerido · ${tempoSugerido(qtdReal())} min`, cfg.tempo === 'sug')}
                    ${chip('tempo', 60, '60 min', String(cfg.tempo) === '60')}
                    ${chip('tempo', 120, '120 min', String(cfg.tempo) === '120')}
                </div>
                <h3 class="sm-sec-titulo">Como sortear</h3>
                <div class="sm-opcoes">${(modelo ? [['modelo', `${icone('caderno')}${modelo.nome}`, 'Cada matéria na proporção da prova']] : []).concat(OPCOES_EXTRA.filter(([k]) => !(modelo && k === 'equilibrar'))).map(([k, nome, det]) => `
                    <button type="button" class="sm-opcao${cfg[k] ? ' ativo' : ''}" data-sm="extra" data-v="${k}" aria-pressed="${cfg[k]}"><span class="sm-opcao-nome">${nome}</span><span class="sm-opcao-det">${det}</span><span class="sm-opcao-marca" aria-hidden="true">${cfg[k] ? icone('certo') : ''}</span></button>`).join('')}</div>
                ${modelo && cfg.modelo ? `<p class="sm-modelo">${modelo.quotas(qtdReal()).map(([m, n]) => `${esc(m.replace(/ &.*$/, '').replace(/,.*$/, ''))} ${n}`).join(' · ')}</p>` : ''}
                <p class="sm-filtros">Usa os filtros atuais: <b>${total}</b> ${total === 1 ? 'questão disponível' : 'questões disponíveis'}.
                    <button type="button" class="sm-link" data-sm="filtros">Mudar filtros</button></p>
                ${total > 0 && cfg.qtd > total ? `<p class="sm-ajuste" role="status">${icone("alerta")}Você escolheu ${cfg.qtd}, mas só há ${total} com esses filtros. O simulado terá ${total}.</p>` : ''}
                <button type="button" class="sm-comecar" data-sm="comecar" ${real ? '' : 'disabled'}>${real ? `${icone('play')}Começar simulado (${real} ${real === 1 ? 'questão' : 'questões'}${minutos() ? ` · ${minutos()} min` : ''})` : 'Nenhuma questão com esses filtros'}</button>
                <p class="sm-aviso">Sem internet, o simulado funciona se você tiver baixado o pacote offline (no menu).</p>
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
            ${aberta ? `<div class="sm-item-det">${htmlResumoMarcas(r.porMateria)}${htmlPorMateria(r.porMateria) || '<p class="sm-vazio">Sem detalhe por matéria.</p>'}</div>` : ''}
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
            const dados = { qtd: cfg.qtd, tempo: minutos(), modelo: Boolean(modelo && cfg.modelo), equilibrar: modelo ? false : cfg.equilibrar, somenteNovas: cfg.somenteNovas, priorizarErros: cfg.priorizarErros };
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
    const comparacao = textoComparacao(p, anteriores);
    const liquida = textoNotaLiquida(resultado.certoErrado);
    const refazer = resultado.erradas || [];
    const focoAntes = document.activeElement;

    const el = document.createElement('div');
    el.className = 'sm-tela';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'sm-titulo');
    el.innerHTML = `
        <header class="sm-topo">
            <div><h2 id="sm-titulo" class="sm-titulo">${icone("feito", "ic-verde")}Resultado</h2><p class="sm-sub">${resultado.porTempo ? 'Tempo esgotado' : 'Simulado finalizado'}</p></div>
            <button type="button" class="sm-sair" data-sm="fechar" aria-label="Fechar o resultado">${icone("fechar")}</button>
        </header>
        <div class="sm-corpo">
            <section class="sm-sec">
                <div class="sm-nota"><b>${resultado.acertos}/${resultado.total}</b><span>${p}%</span></div>
                <p class="sm-linha-info">${formatarDuracao(resultado.segundos)} · ${n(resultado.total - resultado.acertos - (resultado.brancos || 0), 'erro', 'erros')} · ${resultado.brancos || 0} em branco</p>
                ${liquida ? `<p class="sm-liquida">${liquida}</p>` : ''}
                ${comparacao ? `<p class="sm-comp">${esc(comparacao)}</p>` : ''}
                ${resultado.semGabarito ? `<p class="sm-aviso">${resultado.semGabarito} questão(ões) sem gabarito ficaram fora da correção.</p>` : ''}
            </section>
            ${htmlResumoMarcas(resultado.porMateria) ? `<section class="sm-sec">
                <h3 class="sm-sec-titulo">Sua confiança</h3>
                ${htmlResumoMarcas(resultado.porMateria)}
            </section>` : ''}
            <section class="sm-sec">
                <h3 class="sm-sec-titulo">Onde você foi pior</h3>
                ${htmlPorMateria(resultado.porMateria)}
            </section>
            <section class="sm-sec sm-acoes">
                <button type="button" class="sm-comecar" data-sm="correcao">Ver a correção, questão a questão</button>
                ${refazer.length ? `<button type="button" class="sm-sec-btn" data-sm="refazer">Refazer o que errei no Foco (${refazer.length})</button>` : ''}
                <button type="button" class="sm-sec-btn" data-sm="caderno">${icone("caderno")}Abrir o Caderno de erros</button>
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
    // Foco no botão sem rolar: a tela abre no topo, com a nota (v162: o resultado ficou mais longo)
    if (sair) sair.focus({ preventScroll: true });
}
