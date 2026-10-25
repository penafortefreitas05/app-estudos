// ============================================================
// js/storage.js - Gerenciamento Híbrido (Local / Supabase)
// ============================================================

import { carregarHistoricoIncremental } from './supabase.js';
import { aplicarResposta, novoRegistro, normalizarRegistroAntigo } from './revisao.js';

const CHAVE_HISTORICO = 'appEstudos_Historico';
const CHAVE_QUESTOES_IMPORTADAS = 'appEstudos_QuestoesImportadas';
const CHAVE_DIAS_ESTUDO = 'appEstudos_DiasEstudo';
// Resumo do histórico da nuvem já lido (uma entrada por questão) + até onde já foi lido.
// Ao abrir, o app só baixa as respostas novas desde então (antes baixava a vida inteira).
const CHAVE_CACHE_NUVEM = 'appEstudos_ResumoNuvem';

function lerCacheNuvem() {
    try {
        const c = JSON.parse(localStorage.getItem(CHAVE_CACHE_NUVEM) || 'null');
        return (c && typeof c === 'object' && c.mapa && typeof c.mapa === 'object') ? c : null;
    } catch (e) {
        return null;
    }
}

function gravarCacheNuvem(cache) {
    try {
        localStorage.setItem(CHAVE_CACHE_NUVEM, JSON.stringify(cache));
    } catch (e) { /* sem espaço: na próxima abertura baixa tudo de novo, sem perder nada */ }
}

// "Apagar TUDO" e logout de outra conta: o resumo guardado não vale mais
export function apagarCacheNuvem() {
    try { localStorage.removeItem(CHAVE_CACHE_NUVEM); } catch (e) { /* nada a apagar */ }
}

// ---------- Dias de estudo (para a sequência 🔥) ----------
// Guarda só as datas ("2026-10-25") em que pelo menos uma questão foi respondida.

// Data local no formato AAAA-MM-DD (fuso do aparelho, não UTC)
export function diaLocal(momento = Date.now()) {
    const d = new Date(momento);
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
}

export function carregarDiasDeEstudo() {
    try {
        const lista = JSON.parse(localStorage.getItem(CHAVE_DIAS_ESTUDO) || '[]');
        return new Set(Array.isArray(lista) ? lista : []);
    } catch (e) {
        return new Set();
    }
}

function gravarDiasDeEstudo(dias) {
    try {
        // Mantém só o último ano e pouco: suficiente para qualquer sequência real
        const lista = [...dias].sort().slice(-400);
        localStorage.setItem(CHAVE_DIAS_ESTUDO, JSON.stringify(lista));
    } catch (e) { /* sem localStorage: a sequência só não persiste */ }
}

function adicionarDias(novos) {
    const dias = carregarDiasDeEstudo();
    const antes = dias.size;
    novos.forEach(d => d && dias.add(d));
    if (dias.size !== antes) gravarDiasDeEstudo(dias);
}

// Chamada a cada questão respondida (modo estudo e simulado)
export function registrarDiaDeEstudo() {
    adicionarDias([diaLocal()]);
}

export function apagarDiasDeEstudo() {
    try { localStorage.removeItem(CHAVE_DIAS_ESTUDO); } catch (e) { /* nada a apagar */ }
}

/**
 * Converte a lista de linhas da tabela 'historico_respostas' do Supabase
 * no objeto consolidado usado pelo FocoPro
 */
function consolidarRegistrosNuvem(registrosNuvem, mapaNuvem = {}) {
    // As linhas chegam em ordem de data: cada resposta é reaplicada com a regra de revisão
    // espaçada (js/revisao.js), na data em que foi dada. Assim a agenda de revisão é a mesma
    // em qualquer aparelho. mapaNuvem: o resumo já guardado (só as linhas novas são aplicadas).
    if (!Array.isArray(registrosNuvem)) return mapaNuvem;

    registrosNuvem.forEach(reg => {
        const id = String(reg.questao_id || "").trim();
        if (!id) return;
        if (!mapaNuvem[id]) mapaNuvem[id] = novoRegistro();
        aplicarResposta(mapaNuvem[id], {
            acertou: Boolean(reg.acertou),
            confianca: reg.confianca || 'certeza',
            momento: reg.created_at ? new Date(reg.created_at).getTime() : Date.now(),
            letra: reg.resposta_usuario || null
        });
    });

    return mapaNuvem;
}

// Lê o histórico (Une LocalStorage + Tabela historico_respostas do Supabase)
export async function carregarHistorico() {
    let historicoLocal = {};

    // 1. Carrega do LocalStorage imediatamente
    try {
        const salvo = localStorage.getItem(CHAVE_HISTORICO);
        if (salvo) {
            const dados = JSON.parse(salvo);
            if (dados && typeof dados === 'object' && !Array.isArray(dados)) {
                historicoLocal = dados;
            }
        }
    } catch (e) {
        console.warn('Histórico local vazio ou ilegível:', e);
    }

    // 1a. Históricos de antes da revisão espaçada ganham agenda (erros entram na revisão de hoje)
    Object.values(historicoLocal).forEach(normalizarRegistroAntigo);

    // 1b. Dias de estudo a partir da última resposta de cada questão (cobre históricos antigos)
    adicionarDias(Object.values(historicoLocal).map(h => (h && h.ultimaData) ? diaLocal(h.ultimaData) : null));

    // 2. Se o usuário estiver logado, busca na nuvem só o que é novo e mescla
    try {
        const cacheAnterior = lerCacheNuvem();
        const resultado = await carregarHistoricoIncremental(cacheAnterior);
        if (resultado) {
            const { modo, linhas, total, userId } = resultado;
            // Cada resposta na nuvem tem data: recupera os dias de estudo, de qualquer aparelho
            adicionarDias(linhas.map(reg => reg.created_at ? diaLocal(reg.created_at) : null));

            const base = modo === 'incremental' ? cacheAnterior.mapa : {};
            const historicoNuvem = consolidarRegistrosNuvem(linhas, base);
            const ultima = linhas.length ? linhas[linhas.length - 1].created_at : null;
            const cursor = ultima || (modo === 'incremental' ? cacheAnterior.cursor : null);
            if (cursor) gravarCacheNuvem({ userId, cursor, total, mapa: historicoNuvem });
            else apagarCacheNuvem(); // nuvem vazia

            Object.entries(historicoNuvem).forEach(([qId, dadosNuvem]) => {
                const local = historicoLocal[qId];
                if (!local) {
                    historicoLocal[qId] = { ...dadosNuvem };
                } else {
                    // A nuvem é a fonte (tem a data de cada resposta); o local só vence se tiver
                    // MAIS tentativas (respostas ainda na fila offline). Preserva o que só existe
                    // neste aparelho: favorito e anotação ainda não vão para a nuvem.
                    const usarNuvem = (dadosNuvem.tentativas || 0) >= (local.tentativas || 0);
                    historicoLocal[qId] = {
                        ...(usarNuvem ? dadosNuvem : local),
                        anotacao: local.anotacao || dadosNuvem.anotacao || "",
                        favorito: Boolean(local.favorito),
                        ultimaEscolha: local.ultimaEscolha || dadosNuvem.ultimaEscolha || null
                    };
                }
            });

            localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historicoLocal));
        }
    } catch (err) {
        console.warn("Usando apenas histórico local:", err.message);
    }

    return historicoLocal;
}

// Salva o histórico consolidado no LocalStorage instantaneamente
export function salvarHistorico(historico) {
    if (!historico || typeof historico !== 'object') return;
    try {
        localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico));
    } catch (e) {
        console.error('Falha ao salvar no LocalStorage:', e);
    }
}

// O banco de questões agora vem só da nuvem. O antigo cache local de importações
// trazia de volta questões apagadas de propósito; esta função o remove do navegador.
export function limparCacheAntigoDeQuestoes() {
    try {
        localStorage.removeItem(CHAVE_QUESTOES_IMPORTADAS);
    } catch (e) {
        /* navegador sem acesso ao localStorage: nada a limpar */
    }
}