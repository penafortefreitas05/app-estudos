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
import { cfgVazia, cfgParaReceita, receitaParaCfg, receitaComoTexto, montarPelaReceita, contarPorAssunto, contarFeitasPorAssunto, estadoCobertura, normalizar as normalizarTexto } from './receita.js';

const CHAVE_SIMULADOS = 'appEstudos_Simulados';
const CHAVE_CONFIG = 'appEstudos_SimuladoConfig';
const CHAVE_RECEITAS = 'appEstudos_Receitas';
const CHAVE_MONTAGEM = 'appEstudos_SimuladoMontagem';
const MAX_RECEITAS = 12;
const PAGINA = 8;

export const OPCOES_QTD = [10, 20, 40, 60];
export const OPCOES_EXTRA = [
    ['equilibrar', `${icone('balanca')}Um pouco de cada matéria`, 'Sorteio parelho entre as matérias'],
    ['somenteNovas', `${icone('estrela')}Só questões novas`, 'Nada que você já respondeu'],
    ['priorizarErros', `${icone('alvo')}Priorizar meus erros`, 'Começa pelo que você errou ou vence na revisão']
];

// ---------- Regras puras ----------
export const percentual = (r) => (r && r.total ? Math.round((r.acertos * 100) / r.total) : 0);

// Padrão Bacen: 3h30 (210 min) para 120 itens = 1,75 min por item (edital nº 1/2024, item 7.2)
export function tempoSugerido(qtd) { return Math.max(5, Math.round((qtd * 1.75) / 5) * 5); }

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

// Nota líquida das Certo/Errado no padrão Bacen: +1,00 por acerto e −0,50 por erro; branco não desconta
// (edital nº 1/2024, item 8.11.2). `total` (opcional) = todas as questões do simulado, para dizer
// sobre quantas a conta foi feita.
export const fmtNota = (n) => String(Math.round(n * 100) / 100).replace('.', ',');
export function notaLiquida(ce) {
    return (ce && ce.t) ? (ce.a || 0) - 0.5 * (ce.e || 0) : 0;
}
export function textoNotaLiquida(ce, total = 0) {
    if (!ce || !ce.t) return '';
    const liq = notaLiquida(ce);
    const parcial = total && ce.t < total ? ` A conta cobre só as ${ce.t} questões Certo/Errado, de ${total} no simulado.` : '';
    return `Nota líquida (Certo/Errado, −0,50 por erro): <b>${fmtNota(liq)}</b> de ${ce.t} <span class="sm-liq-conta">(${ce.a || 0} − 0,5 × ${ce.e || 0})</span>${parcial}`;
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

// ---------- Receitas guardadas (aparelho) ----------
// [{ nome, texto, em }], a mais recente primeiro; mesmo nome substitui
export function lerReceitas() { const l = ler(CHAVE_RECEITAS, []); return Array.isArray(l) ? l.filter(r => r && r.texto) : []; }
export function guardarReceita(nome, texto, agora = Date.now(), cfg = null) {
    const n = String(nome || 'Sem nome').trim().slice(0, 60) || 'Sem nome';
    const lista = [{ nome: n, texto, em: agora, ...(cfg ? { cfg: JSON.parse(JSON.stringify(cfg)) } : {}) }, ...lerReceitas().filter(r => r.nome !== n)].slice(0, MAX_RECEITAS);
    gravar(CHAVE_RECEITAS, lista);
    return lista;
}
// Montagem em andamento (rascunho da tela): volta igual ao reabrir o Simulado
export function lerMontagem() {
    const c = ler(CHAVE_MONTAGEM, null);
    const base = cfgVazia();
    if (!c || !Array.isArray(c.blocos)) return base;
    return { ...base, ...c, status: { ...base.status, ...(c.status || {}) }, niveis: Array.isArray(c.niveis) ? c.niveis : base.niveis, tempo: c.tempo || base.tempo };
}
export function apagarReceita(nome) { const l = lerReceitas().filter(r => r.nome !== nome); gravar(CHAVE_RECEITAS, l); return l; }

// Linha da prévia: o que foi pedido × o que entra
export function htmlLinhaPrevia(l) {
    const nome = `${esc(l.materia.replace(/ &.*$/, '').replace(/,.*$/, ''))}${l.assunto ? ` / ${esc(l.assunto)}` : ' <span class="sm-rc-det">(qualquer assunto)</span>'}${l.temas && l.temas.length ? ` <span class="sm-rc-det">· tema: ${esc(l.temas.join(', '))}</span>` : ''}`;
    if (l.problema) {
        return `<li class="sm-rc-linha erro">${icone('fechar')}<div><b>${esc(l.problema)}</b>${l.sugestao ? `<span class="sm-rc-det">Você quis dizer “${esc(l.sugestao)}”?</span>` : ''}</div></li>`;
    }
    const falta = l.entraram < l.qtd;
    const det = [l.caderno ? `${l.caderno} do Caderno` : '', l.vistas ? `${l.vistas} já vista${l.vistas > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
    return `<li class="sm-rc-linha${falta ? ' falta' : ''}">${icone(falta ? 'alerta' : 'certo')}<div><span>${nome}</span>
        <span class="sm-rc-num"><b>${l.entraram}</b> de ${l.qtd}${falta ? ` · só há ${l.disponiveis}` : ''}${det ? ` · ${det}` : ''}</span></div></li>`;
}

export function novoId() {
    try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* cai no fallback */ }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });
}

// ---------- Tela de montar + histórico (v172: montador por matéria e assunto) ----------
// Desenho aprovado em 15/11 (Central + sala Design): a tela mostra só o que foi escolhido (um cartão
// por matéria); os assuntos e as quantidades se escolhem numa folha com busca. A configuração
// estruturada (cfg, js/receita.js) é a origem; a receita em texto é gerada dela para salvar e copiar.
// opcoes.dados(): { questoes, historico } do app (já filtradas pelo concurso)
// opcoes.modelo: { nome, quotas(qtd) } do concurso (atalho "prova completa") ou null
// opcoes.carregarHistorico(): Promise<lista> (aparelho + nuvem)
// opcoes.prepararReceita(texto): { receita, montagem } (texto colado, com os nomes do banco)
// opcoes.aoComecarReceita(receita, minutos): começa o simulado
export function abrirSimulado({ carregarHistorico, modelo = null, prepararReceita = null, aoComecarReceita = null, dados = () => ({ questoes: [], historico: {} }) } = {}) {
    if (document.querySelector('.sm-tela')) return;
    let historico = lerSimuladosLocais();
    let mostrando = PAGINA;
    let aberto = null;
    const focoAntes = document.activeElement;
    // tela: 'inicio' | 'receita' (colar texto); folha: null | { tipo: 'materias' } | { tipo: 'assuntos', ... }
    const rc = { tela: 'inicio', texto: '', lida: null };
    const mt = { cfg: lerMontagem(), folha: null, verTodas: false, copiado: false };

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
        <div class="sm-corpo"></div>
        <div class="mt-folha" hidden></div>`;
    document.body.appendChild(el);
    document.body.classList.add('modo-simulado-tela');
    const corpo = el.querySelector('.sm-corpo');
    const folhaEl = el.querySelector('.mt-folha');

    const fechar = () => {
        document.removeEventListener('keydown', aoTeclar, true);
        el.remove();
        document.body.classList.remove('modo-simulado-tela');
        if (focoAntes && focoAntes.focus) focoAntes.focus();
    };
    const aoTeclar = (e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault(); e.stopPropagation();
        if (mt.folha) return fecharFolha();
        fechar();
    };
    document.addEventListener('keydown', aoTeclar, true);

    const chip = (grupo, valor, texto, ativo) => `<button type="button" class="sm-chip${ativo ? ' ativo' : ''}" data-sm="${grupo}" data-v="${valor}" aria-pressed="${ativo}">${texto}</button>`;
    const curto = (m) => String(m || '').replace(/ &.*$/, '').replace(/,.*$/, '');
    const guardar = () => { mt.ultima = null; gravar(CHAVE_MONTAGEM, mt.cfg); };

    // Sorteio de prova (o mesmo do começo): diz, por cartão, quanto entra e de onde vem
    function avaliar() {
        const { questoes, historico: hist } = dados();
        const receita = cfgParaReceita(mt.cfg);
        const montagem = montarPelaReceita(questoes, receita, hist || {});
        const porBloco = mt.cfg.blocos.map(() => ({ pedidas: 0, entraram: 0, disponiveis: 0, caderno: 0, querCaderno: 0, vistas: 0, faltas: [] }));
        montagem.porLinha.forEach((l) => {
            const b = porBloco[l.bloco];
            if (!b) return;
            b.pedidas += l.qtd; b.entraram += l.entraram; b.disponiveis += l.disponiveis;
            b.caderno += l.caderno; b.querCaderno += l.querCaderno; b.vistas += l.vistas;
            if (l.entraram < l.qtd) b.faltas.push({ assunto: l.assunto, qtd: l.qtd, tem: l.disponiveis });
        });
        // v177: guarda este sorteio; "Começar" usa exatamente ele (antes sorteava de novo e o total podia mudar)
        mt.ultima = { receita, montagem, porBloco, contagem: contarPorAssunto(questoes, mt.cfg) };
        return mt.ultima;
    }

    function minutosDe(tempo, total) {
        if (!tempo || tempo.modo === 'sem') return 0;
        return tempo.modo === 'sugerido' ? tempoSugerido(total) : Number(tempo.minutos) || 0;
    }

    function resumoAssuntos(b) {
        if (!b.assuntos.length) return 'Todos os assuntos';
        const nomes = b.assuntos.map((a) => a.replace(/\s*\(.*$/, ''));
        if (b.porAssunto) return nomes.map((n, i) => `${n} ${Number((b.qtdPorAssunto || {})[b.assuntos[i]]) || 0}`).join(' · ');
        return nomes.length <= 2 ? nomes.join(' · ') : `${nomes.slice(0, 2).join(' · ')} e mais ${nomes.length - 2}`;
    }

    function htmlBloco(b, i, av) {
        const s = av.porBloco[i];
        const pedidas = b.porAssunto ? Object.values(b.qtdPorAssunto || {}).reduce((x, n) => x + (Number(n) || 0), 0) : Number(b.qtd) || 0;
        const falta = s.entraram < pedidas;
        const avisos = [];
        if (falta && b.porAssunto) s.faltas.forEach((f) => avisos.push(`<p class="mt-aviso falta">${icone('alerta')}<span>${esc(String(f.assunto).replace(/\s*\(.*$/, ''))}: pediu ${f.qtd}, só há ${f.tem} com esse nível e tipo.</span></p>`));
        else if (falta) avisos.push(`<p class="mt-aviso falta">${icone('alerta')}<span>Você pediu ${pedidas}, mas só ${s.disponiveis === 1 ? 'existe 1 questão' : `existem ${s.disponiveis} questões`}${mt.cfg.status.feitas ? ' já feitas' : ''} com esse nível e tipo.</span>${s.disponiveis ? `<button type="button" class="sm-link" data-sm="mt-ajustar" data-v="${i}">Ajustar para ${s.disponiveis}</button>` : ''}</p>`);
        if (s.vistas && !mt.cfg.status.feitas) avisos.push(`<p class="mt-aviso">${icone('alerta')}<span>Faltaram novas: ${s.vistas} ${s.vistas === 1 ? 'questão já vista entra' : 'questões já vistas entram'} para completar.</span></p>`);
        return `<article class="mt-bloco${falta ? ' falta' : ''}">
            <div class="mt-bloco-topo">
                <h4 class="mt-bloco-nome">${esc(curto(b.materia))}</h4>
                <button type="button" class="mt-remover" data-sm="mt-remover" data-v="${i}" aria-label="Tirar ${esc(curto(b.materia))} do simulado">${icone('fechar')}</button>
            </div>
            <button type="button" class="mt-bloco-assuntos" data-sm="mt-editar" data-v="${i}">
                <span class="mt-bloco-lista">${esc(resumoAssuntos(b))}${b.temas && b.temas.length ? ` · tema: ${esc(b.temas.join(', '))}` : ''}</span>
                <span class="mt-bloco-editar">Editar assuntos e quantidades ›</span>
            </button>
            <div class="mt-bloco-pe">
                ${b.porAssunto
                    ? `<span class="mt-por-assunto">${pedidas} ${pedidas === 1 ? 'questão' : 'questões'} · por assunto</span>`
                    : `<div class="mt-qtd" role="group" aria-label="Questões de ${esc(curto(b.materia))}">
                        <button type="button" class="mt-passo" data-sm="mt-menos" data-v="${i}" aria-label="Menos uma">−</button>
                        <input class="mt-num" type="number" inputmode="numeric" min="0" max="200" value="${Number(b.qtd) || 0}" data-num="bloco" data-i="${i}" aria-label="Quantidade de questões">
                        <button type="button" class="mt-passo" data-sm="mt-mais" data-v="${i}" aria-label="Mais uma">+</button>
                    </div>`}
                <span class="mt-disp">${s.disponiveis} ${s.disponiveis === 1 ? 'disponível' : 'disponíveis'}</span>
            </div>
            ${avisos.join('')}
        </article>`;
    }

    function desenhar() {
        if (rc.tela === 'receita') return desenharReceita();
        const r = resumirSimulados(historico);
        el.querySelector('.sm-sub').textContent = r.feitos ? `${r.feitos} ${r.feitos === 1 ? 'simulado feito' : 'simulados feitos'} · média ${r.media}%` : 'Monte a sua prova';
        const tendencia = r.tendencia.length > 1
            ? `<div class="sm-tendencia" aria-label="Evolução dos últimos simulados">${r.tendencia.map(p => `<i style="height:${Math.max(6, p)}%" title="${p}%"></i>`).join('')}</div>` : '';
        const lista = historico.slice(0, mostrando);
        const guardadas = lerReceitas();
        const visiveis = mt.verTodas ? guardadas : guardadas.slice(0, 2);
        const av = avaliar();
        const total = av.montagem.total;
        const pedidas = av.receita.linhas.reduce((x, l) => x + l.qtd, 0);
        const min = minutosDe(mt.cfg.tempo, total || pedidas);
        const c = mt.cfg;
        const st = c.status.feitas ? 'feitas' : `${c.status.novas}/${c.status.caderno}`;
        corpo.innerHTML = `
            ${guardadas.length ? `<section class="sm-sec">
                <h3 class="sm-sec-titulo">Receitas salvas</h3>
                <div class="sm-rc-guardadas">${visiveis.map((g, i) => `<div class="mt-guardada"><button type="button" class="sm-rc-guardada" data-sm="rc-abrir" data-v="${i}">${icone('caderno')}<span>${esc(g.nome)}</span></button>${mt.verTodas ? `<button type="button" class="mt-remover" data-sm="rc-apagar-g" data-v="${i}" aria-label="Apagar a receita ${esc(g.nome)}">${icone('fechar')}</button>` : ''}</div>`).join('')}</div>
                ${guardadas.length > 2 ? `<button type="button" class="sm-link mt-ver-todas" data-sm="mt-ver-todas">${mt.verTodas ? 'Mostrar só as recentes' : `Ver todas (${guardadas.length})`}</button>` : ''}
            </section>` : ''}
            <section class="sm-sec">
                <div class="mt-prova-topo"><h3 class="sm-sec-titulo">Sua prova</h3><span class="mt-total">${total} ${total === 1 ? 'questão' : 'questões'}</span></div>
                ${c.blocos.length ? c.blocos.map((b, i) => htmlBloco(b, i, av)).join('') : `<p class="sm-vazio">Adicione as matérias da prova. Em cada uma, escolha os assuntos e quantas questões.</p>`}
                <button type="button" class="sm-sec-btn mt-add" data-sm="mt-add">${icone('livro')}Adicionar matéria</button>

                <h3 class="sm-sec-titulo">Origem das questões</h3>
                <div class="sm-chips sm-g4">${[['100/0', 'Só novas'], ['70/30', '70 / 30'], ['50/50', '50 / 50'], ['0/100', 'Só erros']].map(([v, t]) => chip('mt-status', v, t, st === v)).join('')}</div>
                <div class="sm-chips sm-g1">${chip('mt-status', 'feitas', 'Já feitas', st === 'feitas')}</div>
                ${(() => { if (c.status.feitas) return ''; const q = av.porBloco.reduce((x, b) => x + b.querCaderno, 0), t = av.porBloco.reduce((x, b) => x + b.caderno, 0); return c.blocos.length && t < q ? `<p class="mt-aviso">${icone('alerta')}<span>Seu Caderno de erros tem ${t} ${t === 1 ? 'questão' : 'questões'} nesses assuntos e a origem pede ${q}; ${q - t === 1 ? 'a que falta vem' : `as ${q - t} que faltam vêm`} de questões novas.</span></p>` : ''; })()}
                ${(() => { if (c.status.feitas) return ''; const extra = av.porBloco.reduce((x, b) => x + Math.max(0, b.caderno - b.querCaderno), 0); return extra > 0 ? `<p class="mt-aviso">${icone('alerta')}<span>Faltaram questões novas: ${extra === 1 ? '1 questão do seu Caderno de erros entrou' : `${extra} questões do seu Caderno de erros entraram`} para completar.</span></p>` : ''; })()}
                <p class="mt-legenda">${st === 'feitas' ? 'Só questões que você já respondeu (acertos e erros em aberto), misturadas. Serve para testar se o que você já estudou está sólido.' : st === '100/0' ? 'Só questões que você nunca respondeu.' : st === '0/100' ? 'Só questões do Caderno de erros (erros em aberto).' : `${c.status.novas}% novas e ${c.status.caderno}% do Caderno de erros, em cada matéria.`}</p>
                <h3 class="sm-sec-titulo">Nível</h3>
                <div class="sm-chips sm-g4">${chip('mt-nivel', 'todos', 'Todos', !c.niveis.length)}${[[1, 'Iniciante'], [2, 'Intermediário'], [3, 'Avançado']].map(([n, t]) => chip('mt-nivel', n, t, c.niveis.includes(n))).join('')}</div>
                <h3 class="sm-sec-titulo">Tipo</h3>
                <div class="sm-chips sm-g3">${[['todas', 'Todas'], ['certo_errado', 'Certo/Errado'], ['multipla_escolha', 'Múltipla']].map(([v, t]) => chip('mt-tipo', v, t, c.tipo === v)).join('')}</div>
                <h3 class="sm-sec-titulo">Tempo</h3>
                <div class="sm-chips sm-g4">
                    ${chip('mt-tempo', 'sem', 'Livre', c.tempo.modo === 'sem')}
                    ${chip('mt-tempo', 'sugerido', `${total ? `${tempoSugerido(total)} min` : 'Sugerido'}`, c.tempo.modo === 'sugerido')}
                    ${chip('mt-tempo', 60, '60 min', c.tempo.modo === 'minutos' && Number(c.tempo.minutos) === 60)}
                    ${chip('mt-tempo', 120, '120 min', c.tempo.modo === 'minutos' && Number(c.tempo.minutos) === 120)}
                </div>
                ${c.tempo.modo === 'sugerido' ? '<p class="mt-legenda">Sugerido: 1,75 min por questão (3h30 para 120, como no edital do Bacen).</p>' : ''}
                ${c.blocos.length && total < pedidas ? `<p class="sm-ajuste" role="status">${icone('alerta')}Você pediu ${pedidas}, mas o simulado terá ${total}. Veja o aviso no cartão da matéria.</p>` : ''}
                <button type="button" class="sm-comecar" data-sm="mt-comecar" ${total ? '' : 'disabled'}>${total ? `${icone('play')}Começar simulado (${total} ${total === 1 ? 'questão' : 'questões'}${min ? ` · ${min} min` : ''})` : 'Adicione uma matéria para começar'}</button>
                <div class="mt-salvar">
                    <input class="mt-nome" type="text" maxlength="60" placeholder="Nome (ex.: Sábado 21/11)" value="${esc(c.nome)}" aria-label="Nome do simulado">
                    <button type="button" class="sm-sec-btn" data-sm="mt-salvar" ${c.blocos.length ? '' : 'disabled'}>${icone('caderno')}Salvar receita</button>
                </div>
                <div class="mt-secundarias">
                    <button type="button" class="sm-link" data-sm="rc-nova">Colar receita da sala de aula</button>
                    ${c.blocos.length ? `<button type="button" class="sm-link" data-sm="mt-copiar">${mt.copiado ? 'Texto copiado ✓' : 'Copiar como texto'}</button>` : ''}
                    ${c.blocos.length ? `<button type="button" class="sm-link" data-sm="mt-limpar">Começar do zero</button>` : ''}
                </div>
                ${modelo ? `<button type="button" class="mt-modelo" data-sm="mt-modelo">${icone('maleta')}<span><b>Prova completa · 120 questões</b><span>${esc(modelo.nome)} · preenche as matérias na proporção da prova; dá para ajustar antes de começar</span></span></button>` : ''}
                <p class="sm-aviso">Sem internet, o simulado funciona se você tiver baixado o pacote offline (no menu).</p>
            </section>
            <section class="sm-sec">
                <h3 class="sm-sec-titulo">Seus simulados</h3>
                ${r.feitos ? `<div class="sm-stats">
                    <div><b>${r.feitos}</b><span>feitos</span></div><div><b>${r.media}%</b><span>média</span></div><div><b>${r.melhor}%</b><span>melhor</span></div></div>${tendencia}` : '<p class="sm-vazio">Quando você finalizar um simulado, ele aparece aqui com a nota e o tempo.</p>'}
                <div class="sm-historico">${lista.map(item).join('')}</div>
                ${historico.length > mostrando ? `<button type="button" class="sm-mais" data-sm="mais">Mostrar mais (${historico.length - mostrando})</button>` : ''}
            </section>`;
        const nome = corpo.querySelector('.mt-nome');
        if (nome) nome.addEventListener('input', () => { mt.cfg.nome = nome.value; guardar(); });
    }

    // ---------- Folha: escolher matéria / assuntos ----------
    function abrirFolha(f) { mt.folha = f; desenharFolha(); const b = folhaEl.querySelector('.mt-busca, .mt-folha-item'); if (b) b.focus(); }
    function fecharFolha() { mt.folha = null; folhaEl.hidden = true; folhaEl.innerHTML = ''; desenhar(); }

    function desenharFolha() {
        const f = mt.folha;
        if (!f) return;
        folhaEl.hidden = false;
        const contagem = contarPorAssunto(dados().questoes, mt.cfg);
        const feitasMapa = contarFeitasPorAssunto(dados().questoes, dados().historico || {}, mt.cfg);
        const soFeitas = !!mt.cfg.status.feitas;
        const numeros = (feitas, total) => feitas ? `<b>${feitas}</b> de ${total}` : `${total}`;
        const legenda = '<p class="mt-cob-legenda"><span class="mt-cob-ponto comecei"></span>Comecei <span class="mt-cob-ponto coberto"></span>Bem coberto <span class="mt-cob-nota">· “12 de 66” = feitas de total</span></p>';
        if (f.tipo === 'materias') {
            const materias = [...contagem.entries()].map(([m, mapa]) => [m, [...mapa.values()].reduce((x, n) => x + n, 0), [...(feitasMapa.get(m) || new Map()).values()].reduce((x, n) => x + n, 0)]).sort((a, b) => a[0].localeCompare(b[0], 'pt'));
            folhaEl.innerHTML = `
                <div class="mt-folha-caixa" role="dialog" aria-modal="true" aria-label="Escolher matéria">
                    <header class="mt-folha-topo"><button type="button" class="sm-link" data-sm="mt-folha-fechar">← Voltar</button><h3>Adicionar matéria</h3></header>
                    ${legenda}
                    <div class="mt-folha-lista">${materias.map(([m, n, fe]) => `<button type="button" class="mt-folha-item mt-cob-${estadoCobertura(fe, n)}" data-sm="mt-escolher-materia" data-v="${esc(m)}"><span>${esc(m)}</span><span class="mt-disp">${numeros(fe, n)}</span></button>`).join('') || '<p class="sm-vazio">Nenhuma questão com esse nível e tipo.</p>'}</div>
                </div>`;
            return;
        }
        const mapa = contagem.get(f.materia) || new Map();
        const assuntos = [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt'));
        const busca = normalizarTexto(f.busca);
        const filtrados = assuntos.filter(([a]) => !busca || normalizarTexto(a).includes(busca));
        const todos = f.sel.size === 0;
        const soma = f.porAssunto ? [...f.sel].reduce((x, a) => x + (Number(f.qtdPor[a]) || 0), 0) : f.qtd;
        const feitasDaMateria = feitasMapa.get(f.materia) || new Map();
        const quantos = (a) => (soFeitas ? (feitasDaMateria.get(a) || 0) : (mapa.get(a) || 0));
        const dispSel = todos ? assuntos.reduce((x, [a]) => x + quantos(a), 0) : [...f.sel].reduce((x, a) => x + quantos(a), 0);
        folhaEl.innerHTML = `
            <div class="mt-folha-caixa" role="dialog" aria-modal="true" aria-label="Assuntos de ${esc(f.materia)}">
                <header class="mt-folha-topo"><button type="button" class="sm-link" data-sm="mt-folha-fechar">← Voltar</button><h3>${esc(f.materia)}</h3><p>Escolha os assuntos do simulado</p></header>
                ${legenda}
                <input class="mt-busca" type="search" placeholder="Buscar assunto…" value="${esc(f.busca)}" aria-label="Buscar assunto">
                <div class="sm-chips sm-g2 mt-modo">${chip('mt-modo', 'materia', 'Quantidade para a matéria', !f.porAssunto)}${chip('mt-modo', 'assunto', 'Quantidade por assunto', f.porAssunto)}</div>
                <div class="mt-folha-lista">
                    ${f.busca ? '' : `<button type="button" class="mt-folha-item mt-check${todos ? ' marcado' : ''}" data-sm="mt-todos" aria-pressed="${todos}"><span class="mt-caixa" aria-hidden="true">${todos ? icone('certo') : ''}</span><span class="mt-item-nome"><b>Todos os assuntos</b></span><span class="mt-disp">${assuntos.reduce((x, [, n]) => x + n, 0)}</span></button>`}
                    ${filtrados.map(([a, n]) => {
                        const marcado = f.sel.has(a);
                        const [princ, resto] = [a.replace(/\s*\(.*$/, ''), (a.match(/\((.*)\)\s*$/) || [])[1]];
                        return `<div class="mt-linha-assunto${marcado ? ' marcado' : ''}">
                            <button type="button" class="mt-folha-item mt-check mt-cob-${estadoCobertura(feitasDaMateria.get(a) || 0, n)}${marcado ? ' marcado' : ''}" data-sm="mt-assunto" data-v="${esc(a)}" aria-pressed="${marcado}"><span class="mt-caixa" aria-hidden="true">${marcado ? icone('certo') : ''}</span><span class="mt-item-nome"><b>${esc(princ)}</b>${resto ? `<span>${esc(resto)}</span>` : ''}</span><span class="mt-disp">${numeros(feitasDaMateria.get(a) || 0, n)}</span></button>
                            ${marcado && f.porAssunto ? `<div class="mt-qtd mt-qtd-assunto" role="group" aria-label="Questões de ${esc(princ)}">
                                <button type="button" class="mt-passo" data-sm="mt-a-menos" data-v="${esc(a)}" aria-label="Menos uma">−</button>
                                <input class="mt-num" type="number" inputmode="numeric" min="0" max="200" value="${Number(f.qtdPor[a]) || 0}" data-num="assunto" data-a="${esc(a)}" aria-label="Quantidade de ${esc(princ)}">
                                <button type="button" class="mt-passo" data-sm="mt-a-mais" data-v="${esc(a)}" aria-label="Mais uma">+</button></div>` : ''}
                        </div>`;
                    }).join('') || '<p class="sm-vazio">Nenhum assunto com esse nome.</p>'}
                </div>
                <footer class="mt-folha-pe">
                    <div class="mt-folha-resumo"><b>${todos ? 'Todos os assuntos' : `${f.sel.size} ${f.sel.size === 1 ? 'assunto' : 'assuntos'}`}</b><span>${dispSel} disponíveis</span></div>
                    ${f.porAssunto ? `<span class="mt-total">${soma} ${soma === 1 ? 'questão' : 'questões'}</span>` : `<div class="mt-qtd" role="group" aria-label="Questões da matéria">
                        <button type="button" class="mt-passo" data-sm="mt-f-menos" aria-label="Menos uma">−</button>
                        <input class="mt-num" type="number" inputmode="numeric" min="0" max="200" value="${f.qtd}" data-num="folha" aria-label="Quantidade de questões">
                        <button type="button" class="mt-passo" data-sm="mt-f-mais" aria-label="Mais uma">+</button></div>`}
                    <button type="button" class="sm-comecar" data-sm="mt-confirmar" ${(f.porAssunto ? soma : f.qtd) > 0 ? '' : 'disabled'}>Confirmar</button>
                </footer>
            </div>`;
        const b = folhaEl.querySelector('.mt-busca');
        if (b) b.addEventListener('input', () => { f.busca = b.value; const pos = b.selectionStart; desenharFolha(); const nb = folhaEl.querySelector('.mt-busca'); if (nb) { nb.focus(); nb.setSelectionRange(pos, pos); } });
    }

    function folhaDoBloco(i) {
        const b = mt.cfg.blocos[i];
        return { tipo: 'assuntos', i, materia: b.materia, sel: new Set(b.assuntos), porAssunto: Boolean(b.porAssunto && b.assuntos.length), qtdPor: { ...(b.qtdPorAssunto || {}) }, qtd: Number(b.qtd) || 0, busca: '', temas: b.temas || [] };
    }

    function confirmarFolha() {
        const f = mt.folha;
        const assuntos = [...f.sel];
        const porAssunto = f.porAssunto && assuntos.length > 0;
        const qtdPorAssunto = {};
        if (porAssunto) assuntos.forEach((a) => { qtdPorAssunto[a] = Math.max(0, Number(f.qtdPor[a]) || 0); });
        const qtd = porAssunto ? Object.values(qtdPorAssunto).reduce((x, n) => x + n, 0) : Math.max(0, Number(f.qtd) || 0);
        const bloco = { materia: f.materia, assuntos, qtd, porAssunto, qtdPorAssunto, temas: f.temas || [] };
        if (f.i >= 0) mt.cfg.blocos[f.i] = bloco; else mt.cfg.blocos.push(bloco);
        guardar();
        fecharFolha();
    }

    // ---------- Colar texto da sala de aula ----------
    function desenharReceita() {
        const lida = rc.lida;
        const r = lida && lida.receita;
        const m = lida && lida.montagem;
        const erros = r ? r.erros : [];
        const linhasRuins = m ? m.porLinha.filter(l => l.problema).length : 0;
        const boas = m ? m.porLinha.filter(l => !l.problema).length : 0;
        el.querySelector('.sm-sub').textContent = 'Receita da sala de aula';
        corpo.innerHTML = `
            <section class="sm-sec">
                <button type="button" class="sm-link sm-rc-voltar" data-sm="rc-voltar">← Voltar</button>
                <h3 class="sm-sec-titulo">Cole a receita</h3>
                <textarea class="sm-rc-texto" rows="8" spellcheck="false" aria-label="Texto da receita" placeholder="SIMULADO: Sábado&#10;Redes & Segurança da Informação / Scrum → 10&#10;status: 70% novas, 30% Caderno de erros · nível: 1 · tipo: todas&#10;tempo: sugerido">${esc(rc.texto)}</textarea>
                <button type="button" class="sm-sec-btn" data-sm="rc-ler">${icone('olho')}Ler receita</button>
            </section>
            ${lida ? `<section class="sm-sec" aria-live="polite">
                <h3 class="sm-sec-titulo">${esc(r.nome || 'Prévia')}</h3>
                ${erros.length ? `<ul class="sm-rc-lista">${erros.map(e => `<li class="sm-rc-linha erro">${icone('fechar')}<div><b>${esc(e.motivo)}</b>${e.texto ? `<span class="sm-rc-det">Linha ${e.n}: ${esc(e.texto)}</span>` : ''}</div></li>`).join('')}</ul>` : ''}
                <ul class="sm-rc-lista">${m.porLinha.map(htmlLinhaPrevia).join('')}</ul>
                ${linhasRuins || erros.length ? `<p class="sm-ajuste" role="status">${icone('alerta')}${linhasRuins + erros.length === 1 ? 'Uma linha ficou' : `${linhasRuins + erros.length} linhas ficaram`} de fora. Corrija o texto e toque em “Ler receita” de novo, ou siga sem ela.</p>` : ''}
                <button type="button" class="sm-comecar" data-sm="rc-usar" ${boas ? '' : 'disabled'}>${boas ? `${icone('certo')}Usar esta receita` : 'Nenhuma linha válida'}</button>
                <p class="sm-aviso">A receita vai para a tela de montar, onde você confere, ajusta e começa.</p>
            </section>` : ''}`;
        const area = corpo.querySelector('.sm-rc-texto');
        if (area) area.addEventListener('input', () => { rc.texto = area.value; });
    }

    function lerTexto() {
        const area = corpo.querySelector('.sm-rc-texto');
        if (area) rc.texto = area.value;
        rc.lida = rc.texto.trim() && prepararReceita ? prepararReceita(rc.texto) : null;
        desenhar();
        const prev = corpo.querySelector('.sm-rc-lista, .sm-comecar');
        if (prev && prev.scrollIntoView) prev.scrollIntoView({ block: 'nearest' });
    }

    function usarReceita(receitaCasada) {
        mt.cfg = receitaParaCfg(receitaCasada);
        guardar();
        rc.tela = 'inicio'; rc.lida = null;
        desenhar();
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

    // Quantidades digitadas (campo numérico)
    el.addEventListener('change', (e) => {
        const inp = e.target.closest('.mt-num');
        if (!inp) return;
        const n = Math.max(0, Math.min(200, Math.round(Number(inp.value) || 0)));
        if (inp.dataset.num === 'bloco') { const b = mt.cfg.blocos[Number(inp.dataset.i)]; if (b) { b.qtd = n; guardar(); desenhar(); } }
        else if (inp.dataset.num === 'folha' && mt.folha) { mt.folha.qtd = n; desenharFolha(); }
        else if (inp.dataset.num === 'assunto' && mt.folha) { mt.folha.qtdPor[inp.dataset.a] = n; desenharFolha(); }
    });

    el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-sm]');
        if (!b) return;
        const a = b.dataset.sm, v = b.dataset.v;
        const c = mt.cfg;
        if (a === 'fechar') return fechar();
        if (a === 'mais') { mostrando += PAGINA; return desenhar(); }
        if (a === 'item') { aberto = aberto === v ? null : v; return desenhar(); }
        // Montador
        if (a === 'mt-add') return abrirFolha({ tipo: 'materias' });
        if (a === 'mt-escolher-materia') return abrirFolha({ tipo: 'assuntos', i: -1, materia: v, sel: new Set(), porAssunto: false, qtdPor: {}, qtd: 10, busca: '', temas: [] });
        if (a === 'mt-editar') return abrirFolha(folhaDoBloco(Number(v)));
        if (a === 'mt-remover') { c.blocos.splice(Number(v), 1); guardar(); return desenhar(); }
        if (a === 'mt-menos' || a === 'mt-mais') { const bl = c.blocos[Number(v)]; bl.qtd = Math.max(0, Math.min(200, (Number(bl.qtd) || 0) + (a === 'mt-mais' ? 1 : -1))); guardar(); return desenhar(); }
        if (a === 'mt-ajustar') { const av = avaliar(); c.blocos[Number(v)].qtd = av.porBloco[Number(v)].disponiveis; guardar(); return desenhar(); }
        if (a === 'mt-status') { if (v === 'feitas') c.status = { novas: 0, caderno: 0, feitas: true }; else { const [n, k] = v.split('/').map(Number); c.status = { novas: n, caderno: k }; } guardar(); return desenhar(); }
        if (a === 'mt-nivel') {
            if (v === 'todos') c.niveis = [];
            else { const n = Number(v); c.niveis = c.niveis.includes(n) ? c.niveis.filter(x => x !== n) : [...c.niveis, n].sort(); }
            guardar(); return desenhar();
        }
        if (a === 'mt-tipo') { c.tipo = v; guardar(); return desenhar(); }
        if (a === 'mt-tempo') { c.tempo = v === 'sem' || v === 'sugerido' ? { modo: v } : { modo: 'minutos', minutos: Number(v) }; guardar(); return desenhar(); }
        if (a === 'mt-ver-todas') { mt.verTodas = !mt.verTodas; return desenhar(); }
        if (a === 'mt-limpar') { mt.cfg = { ...cfgVazia(), status: c.status, niveis: c.niveis, tipo: c.tipo, tempo: c.tempo }; guardar(); return desenhar(); }
        if (a === 'mt-modelo' && modelo) {
            c.blocos = modelo.quotas(120).map(([m, n]) => ({ materia: m, assuntos: [], qtd: n, porAssunto: false, qtdPorAssunto: {}, temas: [] }));
            c.niveis = []; c.tipo = 'todas'; c.nome = c.nome || 'Prova completa';
            guardar(); desenhar();
            const t = corpo.querySelector('.mt-prova-topo'); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'start' });
            return;
        }
        if (a === 'mt-copiar') {
            const texto = receitaComoTexto(cfgParaReceita(c));
            const ok = () => { mt.copiado = true; desenhar(); setTimeout(() => { mt.copiado = false; if (document.body.contains(el) && rc.tela === 'inicio' && !mt.folha) desenhar(); }, 2500); };
            try { navigator.clipboard.writeText(texto).then(ok, () => {}); } catch (err) { /* sem área de transferência */ }
            return;
        }
        if (a === 'mt-salvar') {
            if (!c.blocos.length) return;
            const nome = (c.nome || '').trim() || 'Sem nome';
            c.nome = nome; guardar();
            guardarReceita(nome, receitaComoTexto(cfgParaReceita(c)), Date.now(), c);
            return desenhar();
        }
        if (a === 'mt-comecar') {
            const av = mt.ultima || avaliar();
            if (!av.montagem.total) return;
            if ((c.nome || '').trim()) guardarReceita(c.nome.trim(), receitaComoTexto(av.receita), Date.now(), c);
            const minutos = minutosDe(c.tempo, av.montagem.total);
            fechar();
            if (aoComecarReceita) aoComecarReceita(av.receita, minutos, av.montagem);
            return;
        }
        // Folha
        if (a === 'mt-folha-fechar') return fecharFolha();
        if (mt.folha && mt.folha.tipo === 'assuntos') {
            const f = mt.folha;
            if (a === 'mt-todos') { f.sel.clear(); return desenharFolha(); }
            if (a === 'mt-assunto') { if (f.sel.has(v)) f.sel.delete(v); else { f.sel.add(v); if (f.porAssunto && !f.qtdPor[v]) f.qtdPor[v] = 3; } return desenharFolha(); }
            if (a === 'mt-modo') { f.porAssunto = v === 'assunto'; if (f.porAssunto) f.sel.forEach((x) => { if (!f.qtdPor[x]) f.qtdPor[x] = 3; }); return desenharFolha(); }
            if (a === 'mt-f-menos' || a === 'mt-f-mais') { f.qtd = Math.max(0, Math.min(200, f.qtd + (a === 'mt-f-mais' ? 1 : -1))); return desenharFolha(); }
            if (a === 'mt-a-menos' || a === 'mt-a-mais') { f.qtdPor[v] = Math.max(0, Math.min(200, (Number(f.qtdPor[v]) || 0) + (a === 'mt-a-mais' ? 1 : -1))); return desenharFolha(); }
            if (a === 'mt-confirmar') return confirmarFolha();
        }
        // Receitas
        if (a === 'rc-nova') { rc.tela = 'receita'; rc.texto = ''; rc.lida = null; desenhar(); const t = corpo.querySelector('.sm-rc-texto'); if (t) t.focus(); return; }
        if (a === 'rc-abrir') {
            const g = lerReceitas()[Number(v)];
            if (!g) return;
            if (g.cfg && Array.isArray(g.cfg.blocos)) { mt.cfg = { ...cfgVazia(), ...g.cfg, nome: g.nome }; guardar(); return desenhar(); }
            const lida = prepararReceita ? prepararReceita(g.texto) : null;
            if (lida) { lida.receita.nome = lida.receita.nome || g.nome; usarReceita(lida.receita); }
            return;
        }
        if (a === 'rc-apagar-g') { const g = lerReceitas()[Number(v)]; if (g) apagarReceita(g.nome); return desenhar(); }
        if (a === 'rc-voltar') { rc.tela = 'inicio'; rc.lida = null; return desenhar(); }
        if (a === 'rc-ler') return lerTexto();
        if (a === 'rc-usar') { if (rc.lida) usarReceita(rc.lida.receita); return; }
    });

    desenhar();
    const sair = el.querySelector('.sm-sair');
    if (sair) sair.focus();
    // Histórico completo (aparelho + nuvem) chega depois, sem travar a tela
    if (typeof carregarHistorico === 'function') {
        carregarHistorico().then((l) => { if (Array.isArray(l) && document.body.contains(el)) { historico = l; if (!mt.folha) desenhar(); } }).catch(() => {});
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
    const liquida = textoNotaLiquida(resultado.certoErrado, resultado.total);
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
