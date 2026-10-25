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
