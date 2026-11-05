// ============================================================
// js/revisao.js - Revisão espaçada e status de cada questão (FocoPro)
// ============================================================
// Uma regra só, usada em três lugares: resposta no modo estudo (app.js), correção do
// simulado (simulado.js) e reconstrução do histórico a partir da nuvem (storage.js).
//
// Como funciona:
//   - Errou: a questão entra na revisão e volta amanhã (nível 0).
//   - Acertou "na dúvida": não prova que sabe; volta amanhã, sem subir de nível.
//   - Acertou "com certeza" no dia da revisão (ou depois): sobe de nível e o intervalo cresce
//     (1 → 3 → 7 → 21 dias). Passou da revisão de 21 dias: sai da revisão como Dominada.
//   - Acertou de novo no MESMO dia do erro: não conta. Lembrar 1 minuto depois de ver o
//     gabarito é memória de curto prazo, não aprendizado (antes isso já virava "Superada").
//   - Fora da revisão: Dominada quando acerta com certeza em 2 dias diferentes.

import { diaLocal } from './storage.js';

// Dias até a próxima revisão, por nível
export const INTERVALOS = [1, 3, 7, 21];

// Soma dias a uma data "AAAA-MM-DD" no calendário local
export function somarDias(dia, n) {
    const [a, m, d] = dia.split('-').map(Number);
    return diaLocal(new Date(a, m - 1, d + n));
}

export function novoRegistro() {
    return {
        acertos: 0,
        erros: 0,
        tentativas: 0,
        ultimaResposta: null,
        ultimaEscolha: null,
        recentes: [],
        status: 'novo',
        anotacao: ""
    };
}

/**
 * Registra uma resposta no histórico da questão (muda o objeto h).
 * resposta: { acertou, confianca: 'certeza' | 'duvida', momento (ms), letra? }
 * Sem confiança informada (respostas antigas) conta como "certeza".
 */
export function aplicarResposta(h, { acertou, confianca, momento = Date.now(), letra = null }) {
    const hoje = diaLocal(momento);
    const comCerteza = confianca !== 'duvida';
    const emRevisao = Boolean(h.revisaoEm);
    if (h.nivel === undefined) h.nivel = 0; // marca o registro como do formato novo

    h.tentativas = (h.tentativas || 0) + 1;
    if (acertou) h.acertos = (h.acertos || 0) + 1;
    else h.erros = (h.erros || 0) + 1;

    if (!Array.isArray(h.recentes)) h.recentes = [];
    h.recentes.push(acertou ? 1 : 0);
    if (h.recentes.length > 5) h.recentes.shift();

    h.ultimaResposta = acertou ? 'certo' : 'errado';
    if (letra) h.ultimaEscolha = String(letra).trim().toUpperCase();
    h.ultimaConfianca = comCerteza ? 'certeza' : 'duvida';
    h.ultimaData = momento;

    if (!acertou) {
        if (letra) h.letraErrada = String(letra).trim().toUpperCase();
        h.nivel = 0;
        h.revisaoEm = somarDias(hoje, INTERVALOS[0]);
        h.status = 'erro';
        h.erroComCerteza = comCerteza;
        return h;
    }

    if (!comCerteza) {
        // Acerto no chute: revisa amanhã, sem subir de nível
        if (!emRevisao) {
            h.nivel = 0;
            h.status = 'duvida';
        }
        h.revisaoEm = somarDias(hoje, INTERVALOS[0]);
        return h;
    }

    // Acerto com certeza
    if (h.ultimoDiaAcerto !== hoje) {
        h.diasComAcerto = (h.diasComAcerto || 0) + 1;
        h.ultimoDiaAcerto = hoje;
    }

    if (emRevisao) {
        if (hoje >= h.revisaoEm) {
            h.nivel = (h.nivel || 0) + 1;
            h.erroComCerteza = false;
            if (h.nivel >= INTERVALOS.length) {
                h.revisaoEm = null;
                h.status = 'dominada';
            } else {
                h.revisaoEm = somarDias(hoje, INTERVALOS[h.nivel]);
                h.status = 'superado';
            }
        }
        // Antes do dia marcado: não conta, a agenda continua a mesma
        return h;
    }

    h.status = (h.diasComAcerto || 0) >= 2 ? 'dominada' : 'acerto';
    return h;
}

// A questão vence hoje (ou já venceu)?
export function venceHoje(h, hoje = diaLocal()) {
    return Boolean(h && h.revisaoEm && h.revisaoEm <= hoje);
}

/**
 * Históricos gravados antes da revisão espaçada não têm agenda.
 * Erro antigo: entra na revisão para hoje. "Superada" antiga: nível 1, revisão em 3 dias
 * a partir da última resposta. Não mexe em quem já tem agenda.
 */
export function normalizarRegistroAntigo(h) {
    if (!h || typeof h !== 'object' || h.nivel !== undefined) return h;
    const hoje = diaLocal();
    const diaUltima = h.ultimaData ? diaLocal(h.ultimaData) : hoje;
    if (h.status === 'erro' || (h.ultimaResposta === 'errado' && h.status !== 'superado')) {
        h.nivel = 0;
        h.revisaoEm = hoje;
        h.status = 'erro';
    } else if (h.status === 'superado') {
        h.nivel = 1;
        h.revisaoEm = somarDias(diaUltima, INTERVALOS[1]);
    } else if (h.tentativas > 0) {
        h.nivel = 0;
        h.diasComAcerto = h.diasComAcerto || 1;
        h.ultimoDiaAcerto = h.ultimoDiaAcerto || diaUltima;
        if (h.status !== 'dominada') h.status = 'acerto';
    }
    return h;
}

// "25/10" a partir de "2026-10-25"
export function formatarDiaCurto(dia) {
    if (!dia) return "";
    const [, m, d] = dia.split('-');
    return `${d}/${m}`;
}


// ============================================================
// FILA DO DIA: teto fixo e amostra por assunto (decidido com o Nathan em 05/11/2026)
// ============================================================
// Antes, "Revisar hoje" mostrava TODAS as questões vencidas (46, depois de uma semana parada
// seriam centenas). Agora:
//   - no máximo TETO_DIARIO questões por dia;
//   - no máximo POR_ASSUNTO de cada assunto (errou 10 de um assunto: entram 3);
//   - se a amostra do assunto foi bem (2 ou mais acertos com certeza no mesmo dia), as outras
//     vencidas desse assunto ficam em pausa (3 dias; 7 se já foi bem em mais de um dia);
//   - o resto não some: fica no Caderno de erros e volta quando chegar a vez.
// Tudo sai do histórico (que vem da nuvem), então celular e computador chegam ao mesmo resultado.

export const TETO_DIARIO = 15;
export const POR_ASSUNTO = 3;
const CHAVE_FILA_DIA = 'appEstudos_FilaDia';

export const chaveDoAssunto = (q) => `${q.materia || 'Geral'}|${q.assunto || 'Geral'}`;

const diaDe = (h) => (h && h.ultimaData ? diaLocal(h.ultimaData) : null);

// Dias de pausa do assunto hoje (0 = sem pausa). hs: históricos das questões do assunto.
export function pausaDoAssunto(hs, hoje = diaLocal()) {
    const bons = {}; // dia -> quantas questões foram bem nesse dia
    let ultimoErro = null;
    hs.forEach((h) => {
        const d = diaDe(h);
        if (!d) return;
        if (h.ultimaResposta === 'errado') {
            if (!ultimoErro || d > ultimoErro) ultimoErro = d;
        } else if (h.ultimaResposta === 'certo' && h.ultimaConfianca === 'certeza' && (h.nivel || 0) >= 1) {
            bons[d] = (bons[d] || 0) + 1;
        }
    });
    const diasBons = Object.keys(bons).filter((d) => bons[d] >= 2).sort();
    if (!diasBons.length) return 0;
    const ultimoBom = diasBons[diasBons.length - 1];
    if (ultimoErro && ultimoErro >= ultimoBom) return 0;
    const pausa = diasBons.length >= 2 ? 7 : 3;
    return somarDias(ultimoBom, pausa) > hoje ? pausa : 0;
}

/**
 * Escolhe a fila do dia. Pura: mesmo histórico e mesmo dia dão a mesma fila.
 * Devolve { fila: [questões], venciam, pausadas, adiadas }.
 */
export function montarFilaDoDia(questoes, historico, hoje = diaLocal(), { teto = TETO_DIARIO, porAssunto = POR_ASSUNTO } = {}) {
    const grupos = new Map();
    questoes.forEach((q) => {
        const k = chaveDoAssunto(q);
        if (!grupos.has(k)) grupos.set(k, []);
        grupos.get(k).push(q);
    });

    let venciam = 0, pausadas = 0;
    const candidatos = [];
    grupos.forEach((qs) => {
        const hs = qs.map((q) => historico[String(q.id)]).filter(Boolean);
        const vencidas = qs.filter((q) => venceHoje(historico[String(q.id)], hoje));
        if (!vencidas.length) return;
        venciam += vencidas.length;
        if (pausaDoAssunto(hs, hoje) > 0) { pausadas += vencidas.length; return; }
        vencidas.sort((a, b) => {
            const ha = historico[String(a.id)], hb = historico[String(b.id)];
            // Erro com certeza primeiro (é o que mais pede revisão), depois as mais atrasadas
            const ca = ha.erroComCerteza ? 0 : 1, cb = hb.erroComCerteza ? 0 : 1;
            if (ca !== cb) return ca - cb;
            if (ha.revisaoEm !== hb.revisaoEm) return ha.revisaoEm < hb.revisaoEm ? -1 : 1;
            return String(a.id).localeCompare(String(b.id));
        });
        candidatos.push(vencidas);
    });

    // Assuntos com mais questões vencidas e mais atrasadas primeiro
    candidatos.sort((x, y) => {
        if (x.length !== y.length) return y.length - x.length;
        const ax = historico[String(x[0].id)].revisaoEm, ay = historico[String(y[0].id)].revisaoEm;
        return ax < ay ? -1 : ax > ay ? 1 : 0;
    });

    // Uma de cada assunto por rodada, até o teto: a fila mistura assuntos em vez de despejar um só
    const fila = [];
    for (let rodada = 0; rodada < porAssunto && fila.length < teto; rodada++) {
        for (const lista of candidatos) {
            if (fila.length >= teto) break;
            if (lista[rodada]) fila.push(lista[rodada]);
        }
    }
    return { fila, venciam, pausadas, adiadas: venciam - pausadas - fila.length };
}

// A fila escolhida de manhã fica guardada no aparelho para o dia inteiro: sem isso, cada
// questão respondida faria entrar outra no lugar e o dia nunca acabaria.
let filaAtual = { ids: new Set(), restantes: [], total: 0, feitas: 0, venciam: 0 };

function lerFilaDoDia() {
    try {
        const f = JSON.parse(localStorage.getItem(CHAVE_FILA_DIA) || 'null');
        return f && typeof f.dia === 'string' && Array.isArray(f.ids) ? f : null;
    } catch (e) { return null; }
}

export function atualizarFilaDoDia(questoes, historico, hoje = diaLocal()) {
    if (!Array.isArray(questoes) || !questoes.length) return filaAtual;
    let salva = lerFilaDoDia();
    if (!salva || salva.dia !== hoje) {
        const r = montarFilaDoDia(questoes, historico, hoje);
        salva = { dia: hoje, ids: r.fila.map((q) => String(q.id)), venciam: r.venciam };
        // Fila vazia não é gravada: o histórico pode ainda não ter chegado
        if (salva.ids.length) {
            try { localStorage.setItem(CHAVE_FILA_DIA, JSON.stringify(salva)); } catch (e) { /* refaz na próxima */ }
        }
    }
    const porId = new Map(questoes.map((q) => [String(q.id), q]));
    const presentes = salva.ids.filter((id) => porId.has(id));
    const restantes = presentes
        .filter((id) => venceHoje(historico[id], hoje))
        .map((id) => porId.get(id));
    filaAtual = {
        ids: new Set(restantes.map((q) => String(q.id))),
        restantes,
        total: presentes.length,
        feitas: presentes.length - restantes.length,
        venciam: salva.venciam || 0
    };
    return filaAtual;
}

export const filaDeHoje = () => filaAtual;
export const naFila = (id) => filaAtual.ids.has(String(id));
