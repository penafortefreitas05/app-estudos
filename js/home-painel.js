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

// dados: { ontem, semana, foco, totalFeitas, exploracaoAberta }
export function htmlHomePainel({ ontem, semana, foco, totalFeitas, exploracaoAberta }) {
    return `<div class="home-grade">
            <article class="home-card"><h3 class="home-titulo">Ontem</h3>${htmlOntem(ontem, totalFeitas)}</article>
            <article class="home-card"><h3 class="home-titulo">Onde melhorar</h3>${htmlFoco(foco, totalFeitas)}</article>
        </div>
        <article class="home-card"><h3 class="home-titulo">Semana</h3>${htmlSemana(semana)}</article>
        <button type="button" class="btn-secondary home-explorar" aria-expanded="${exploracaoAberta}">${exploracaoAberta ? 'Esconder as questões' : 'Explorar questões'}</button>`;
}
