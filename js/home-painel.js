// ============================================================
// js/home-painel.js - Painel da "Home nova" (piloto, FocoPro v192, 23/11/2026)
// ============================================================
// Proposta da Sala Design (relatório de 23/11, aprovada pelo Nathan): a Home deixa de ser só uma lista
// de questões e responde 3 perguntas: o que estudar hoje (cartão "Seu treino de hoje", que continua
// como está), como foi ontem e onde melhorar, mais a semana. Aqui há só funções puras (cálculo) e a
// montagem do HTML; quem liga e desliga o piloto e busca os dados é o app.js.
// Regras: nada aqui altera pontuação, revisão ou domínio. Sem dados suficientes, a mensagem é neutra.

import { diaLocal } from './storage.js';
import { esc } from './ui.js';
import { prioridadesDeRecuperacao } from './prioridade.js';
import { resumirPorDia, renderizarMeuDia } from './meu-dia.js';

const NOMES_DIA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const UM_DIA = 24 * 60 * 60 * 1000;

function chaveDoDia(agora, deslocamento) {
    const d = new Date(agora);
    d.setDate(d.getDate() - deslocamento);
    return diaLocal(d.getTime());
}

// Ontem a partir das respostas da nuvem (uma linha por tentativa; é a mesma fonte do "Meu dia").
// confianca: 'certeza' | 'duvida' | ausente. Devolve null se não houver a lista de linhas.
export function ontemDasLinhas(linhas, agora = Date.now()) {
    if (!Array.isArray(linhas)) return null;
    const ontem = chaveDoDia(agora, 1);
    let n = 0, acertos = 0, errosComCerteza = 0, temConfianca = false;
    linhas.forEach((l) => {
        if (diaLocal(new Date(l.created_at).getTime()) !== ontem) return;
        n += 1;
        if (l.acertou) acertos += 1;
        if (l.confianca) temConfianca = true;
        if (!l.acertou && l.confianca === 'certeza') errosComCerteza += 1;
    });
    return { n, acertos, erros: n - acertos, errosComCerteza, temConfianca, fonte: 'nuvem' };
}

// Sem internet: usa a última resposta de cada questão (aproximação; o texto não finge ser exato).
export function ontemLocal(historico, agora = Date.now()) {
    const ontem = chaveDoDia(agora, 1);
    let n = 0, acertos = 0, errosComCerteza = 0;
    Object.values(historico || {}).forEach((h) => {
        if (!h || !h.ultimaData || diaLocal(h.ultimaData) !== ontem) return;
        n += 1;
        if (h.ultimaResposta === 'certo') acertos += 1;
        else if (h.erroComCerteza) errosComCerteza += 1;
    });
    return { n, acertos, erros: n - acertos, errosComCerteza, temConfianca: true, fonte: 'local' };
}

// Últimos 7 dias: [{ rotulo, n, hoje }] do mais antigo ao de hoje
export function semanaDasLinhas(linhas, agora = Date.now()) {
    const dias = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(agora); d.setDate(d.getDate() - i);
        dias.push({ chave: diaLocal(d.getTime()), rotulo: i === 0 ? 'hoje' : NOMES_DIA[d.getDay()], n: 0, hoje: i === 0 });
    }
    const porChave = new Map(dias.map((x) => [x.chave, x]));
    (linhas || []).forEach((l) => { const x = porChave.get(diaLocal(new Date(l.created_at).getTime())); if (x) x.n += 1; });
    return dias;
}

export function semanaLocal(historico, agora = Date.now()) {
    const linhas = [];
    Object.values(historico || {}).forEach((h) => { if (h && h.ultimaData) linhas.push({ created_at: new Date(h.ultimaData).toISOString() }); });
    return semanaDasLinhas(linhas, agora);
}

// Uma única prioridade de estudo, ou null. Reaproveita a regra da recuperação (mínimo de 4 respondidas
// no assunto e pelo menos 1 erro em aberto; erro com certeza pesa mais): baixa cobertura sozinha não conta.
export function focoPrioritario(questoes, historico) {
    return prioridadesDeRecuperacao(questoes, historico, { topo: 1 })[0] || null;
}

export function totalRespondidas(historico) {
    return Object.values(historico || {}).filter((h) => h && h.tentativas > 0).length;
}

const curto = (m) => String(m || '').replace(/\s*[&,(].*$/, '');
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function htmlOntem(o, totalFeitas) {
    if (!totalFeitas) return '<p class="home-vazio">Seu painel começa a preencher assim que você responder as primeiras questões.</p>';
    if (!o || !o.n) return '<p class="home-vazio">Você não respondeu questões ontem. Hoje é um bom dia para retomar.</p>';
    const pct = Math.round(o.acertos * 100 / o.n);
    const classe = pct >= 70 ? 'alta' : (pct >= 50 ? 'media' : 'baixa');
    return `<p class="home-grande"><strong>${plural(o.n, 'questão', 'questões')}</strong><span class="home-pct ${classe}">${pct}%</span></p>
        <p class="home-linha">${plural(o.acertos, 'certa', 'certas')} · ${plural(o.erros, 'errada', 'erradas')}</p>
        ${o.temConfianca && o.errosComCerteza ? `<p class="home-linha destaque">${plural(o.errosComCerteza, 'erro com certeza', 'erros com certeza')}</p>` : ''}
        ${o.fonte === 'local' ? '<p class="home-nota">Pela última resposta de cada questão (sem conexão).</p>' : ''}`;
}

function htmlFoco(foco, totalFeitas) {
    if (!foco) {
        return totalFeitas < 20
            ? '<p class="home-vazio">Ainda há poucas respostas para apontar um foco. Continue respondendo.</p>'
            : '<p class="home-vazio">Nenhuma dificuldade prioritária agora. Siga o treino de hoje.</p>';
    }
    return `<p class="home-grande"><strong>${esc(curto(foco.materia))}</strong></p>
        <p class="home-linha">${esc(foco.assunto)}</p>
        <p class="home-linha destaque">${plural(foco.erradas, 'errada', 'erradas')} de ${foco.respondidas}${foco.comCerteza ? ` · ${foco.comCerteza} com certeza` : ''}</p>
        <button type="button" class="btn-secondary home-caderno" data-materia="${esc(foco.materia)}" data-assunto="${esc(foco.assunto)}">Ver os erros deste assunto</button>`;
}

function htmlSemana(dias) {
    const total = dias.reduce((t, d) => t + d.n, 0);
    const diasComEstudo = dias.filter((d) => d.n > 0).length;
    if (!total) return '<p class="home-vazio">Sem questões nos últimos 7 dias. O primeiro dia de estudo já aparece aqui.</p>';
    const max = Math.max(...dias.map((d) => d.n), 1);
    const colunas = dias.map((d) => `<span class="home-col${d.hoje ? ' hoje' : ''}" title="${d.n ? plural(d.n, 'questão', 'questões') : 'sem questões'}">
            <span class="home-col-n">${d.n || ''}</span>
            <span class="home-col-caixa"><span class="home-col-barra" style="height:${d.n ? Math.max(8, Math.round(d.n * 100 / max)) : 0}%"></span></span>
            <span class="home-col-rot">${d.rotulo}</span>
        </span>`).join('');
    return `<p class="home-linha"><strong>${plural(total, 'questão', 'questões')}</strong> em ${diasComEstudo} de 7 dias</p>
        <div class="home-colunas" role="img" aria-label="Questões por dia nos últimos 7 dias">${colunas}</div>
        <button type="button" class="btn-link home-meu-dia">Ver os detalhes em Meu dia</button>`;
}

// "Meu dia" completo (o mesmo da tela Meu dia: hoje por revisão e novas, meta e os últimos 7 dias)
export function htmlMeuDia(linhas, jaVistas, vencidas = 0, agora = Date.now()) {
    const raiz = document.createElement('div');
    renderizarMeuDia(raiz, resumirPorDia(linhas || [], jaVistas || new Set(), 7, agora), { vencidas });
    return raiz.innerHTML;
}

// Relatório dos simulados (do mais novo ao mais antigo): resumo + os 3 últimos.
// lista: [{ em, total, acertos, segundos, porTempo }]
// Soma todos os simulados por matéria; só entra quem tem 5+ questões (senão o % engana)
export function materiasDosSimulados(lista) {
    const soma = {};
    lista.forEach((r) => Object.entries(r.porMateria || {}).forEach(([nome, v]) => {
        const x = soma[nome] || (soma[nome] = { nome, t: 0, a: 0 });
        x.t += (v && v.t) || 0; x.a += (v && v.a) || 0;
    }));
    const todas = Object.values(soma).filter((m) => m.t >= 5).map((m) => ({ ...m, pct: Math.round((m.a * 100) / m.t) })).sort((x, y) => x.pct - y.pct || y.t - x.t);
    if (todas.length < 2) return null;
    const n = Math.min(3, Math.floor(todas.length / 2));
    return { fracas: todas.slice(0, n), fortes: todas.slice(-n).reverse() };
}

export function dadosDeSimulados(lista) {
    const l = Array.isArray(lista) ? lista.filter((r) => r && r.total) : [];
    if (!l.length) return null;
    const pct = (r) => Math.round((r.acertos * 100) / r.total);
    const pcts = l.map(pct);
    return {
        feitos: l.length,
        media: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
        melhor: Math.max(...pcts),
        materias: materiasDosSimulados(l),
        ultimos: l.slice(0, 5).map((r) => ({ em: r.em, acertos: r.acertos, total: r.total, pct: pct(r), segundos: r.segundos, porTempo: r.porTempo,
            materias: Object.entries(r.porMateria || {}).map(([nome, v]) => ({ nome, t: (v && v.t) || 0, a: (v && v.a) || 0 })).filter((m) => m.t).sort((x, y) => y.t - x.t) }))
    };
}

const dataCurta = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; };
const duracao = (seg) => { const s = Math.max(0, Math.round(seg || 0)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; return h ? `${h}h${String(m).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`; };

const corPct = (p) => (p >= 80 ? 'bom' : p >= 60 ? 'medio' : 'baixo');
const linhaMateria = (m) => `<li><span>${esc(m.nome)}</span><b class="home-pct-${corPct(m.pct)}">${m.pct}%</b><small>${m.a}/${m.t}</small></li>`;

function htmlSimulados(sim) {
    if (!sim) return '<p class="home-vazio">Quando você finalizar um simulado, o relatório aparece aqui.</p>';
    const mm = sim.materias;
    const painel = mm ? `<div class="home-sim-mat">
            <div><h4>Mais fracas nos simulados</h4><ul>${mm.fracas.map(linhaMateria).join('')}</ul></div>
            <div><h4>Mais fortes nos simulados</h4><ul>${mm.fortes.map(linhaMateria).join('')}</ul></div>
        </div>` : '';
    const chips = (r) => {
        if (!r.materias.length) return '<span class="home-sim-mats home-sim-mats-vazio">Sem detalhe por matéria</span>';
        const vis = r.materias.slice(0, 3), resto = r.materias.length - vis.length;
        return `<span class="home-sim-mats">${vis.map((m) => `<i class="home-sim-chip">${esc(m.nome)} <b>${m.a}/${m.t}</b></i>`).join('')}${resto > 0 ? `<i class="home-sim-chip home-sim-mais">+${resto}</i>` : ''}</span>`;
    };
    return `<div class="sm-stats"><div><b>${sim.feitos}</b><span>feitos</span></div><div><b>${sim.media}%</b><span>média</span></div><div><b>${sim.melhor}%</b><span>melhor</span></div></div>
        ${painel}
        <div class="home-sim-lista">${sim.ultimos.map((r) => `<p class="home-sim-linha"><span class="home-sim-data">${dataCurta(r.em)}</span><span class="home-sim-nota"><strong>${r.acertos}/${r.total}</strong> · ${r.pct}%</span>${chips(r)}<span class="home-sim-tempo">${duracao(r.segundos)}${r.porTempo ? ' ⏰' : ''}</span></p>`).join('')}</div>
        <button type="button" class="btn-link home-simulados">Ver todos os simulados</button>`;
}

// dados: { ontem, semana, foco, totalFeitas, exploracaoAberta, meuDia (html ou null), simulados }
export function htmlHomePainel({ ontem, semana, foco, totalFeitas, exploracaoAberta, meuDia = null, simulados = null }) {
    const blocoDia = meuDia
        ? `<article class="home-card home-meu-dia-card"><h3 class="home-titulo">Meu dia</h3>${meuDia}</article>`
        : `<article class="home-card"><h3 class="home-titulo">Semana</h3>${htmlSemana(semana)}</article>`;
    return `${blocoDia}
        <div class="home-grade">
            <article class="home-card"><h3 class="home-titulo">Ontem</h3>${htmlOntem(ontem, totalFeitas)}</article>
            <article class="home-card"><h3 class="home-titulo">Onde melhorar</h3>${htmlFoco(foco, totalFeitas)}</article>
        </div>
        <article class="home-card"><h3 class="home-titulo">Seus simulados</h3>${htmlSimulados(simulados)}</article>
        <button type="button" class="btn-secondary home-explorar" aria-expanded="${exploracaoAberta}">${exploracaoAberta ? 'Esconder as questões' : 'Explorar questões'}</button>`;
}
