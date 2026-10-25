// ============================================================
// js/storage.js - Gerenciamento Híbrido (Local / Supabase)
// ============================================================

import { carregarHistoricoDoUsuario } from './supabase.js';

const CHAVE_HISTORICO = 'appEstudos_Historico';
const CHAVE_QUESTOES_IMPORTADAS = 'appEstudos_QuestoesImportadas';
const CHAVE_DIAS_ESTUDO = 'appEstudos_DiasEstudo';

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
function consolidarRegistrosNuvem(registrosNuvem) {
    const mapaNuvem = {};
    if (!Array.isArray(registrosNuvem)) return mapaNuvem;

    registrosNuvem.forEach(reg => {
        const id = String(reg.questao_id || "").trim();
        if (!id) return;

        if (!mapaNuvem[id]) {
            mapaNuvem[id] = {
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

        const item = mapaNuvem[id];
        const acertou = Boolean(reg.acertou);

        item.tentativas += 1;
        if (acertou) {
            item.acertos += 1;
            item.status = (item.status === 'erro' || item.ultimaResposta === 'errado') ? 'superado' : 'acerto';
        } else {
            item.erros += 1;
            item.status = 'erro';
        }

        item.ultimaResposta = acertou ? 'certo' : 'errado';
        if (reg.resposta_usuario) {
            item.ultimaEscolha = String(reg.resposta_usuario).trim().toUpperCase();
        }
        item.recentes.push(acertou ? 1 : 0);
        if (item.recentes.length > 5) item.recentes.shift();
        item.ultimaData = reg.created_at ? new Date(reg.created_at).getTime() : Date.now();
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

    // 1b. Dias de estudo a partir da última resposta de cada questão (cobre históricos antigos)
    adicionarDias(Object.values(historicoLocal).map(h => (h && h.ultimaData) ? diaLocal(h.ultimaData) : null));

    // 2. Se o usuário estiver logado, busca da tabela historico_respostas e mescla
    try {
        const registrosNuvem = await carregarHistoricoDoUsuario();
        if (Array.isArray(registrosNuvem) && registrosNuvem.length > 0) {
            // Cada resposta na nuvem tem data: recupera todos os dias de estudo, de qualquer aparelho
            adicionarDias(registrosNuvem.map(reg => reg.created_at ? diaLocal(reg.created_at) : null));

            const historicoNuvem = consolidarRegistrosNuvem(registrosNuvem);

            Object.entries(historicoNuvem).forEach(([qId, dadosNuvem]) => {
                const local = historicoLocal[qId];
                if (!local) {
                    historicoLocal[qId] = dadosNuvem;
                } else {
                    // Mantém o que tiver mais tentativas e preserva anotações pessoais locais
                    const usarNuvem = (dadosNuvem.tentativas || 0) > (local.tentativas || 0);
                    historicoLocal[qId] = {
                        ...(usarNuvem ? dadosNuvem : local),
                        anotacao: local.anotacao || dadosNuvem.anotacao || "",
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