// ============================================================
// js/storage.js - Gerenciamento Híbrido (Local / Supabase)
// ============================================================

import { carregarHistoricoDoUsuario } from './supabase.js';

const CHAVE_HISTORICO = 'appEstudos_Historico';
const CHAVE_QUESTOES_IMPORTADAS = 'appEstudos_QuestoesImportadas';

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

    // 2. Se o usuário estiver logado, busca da tabela historico_respostas e mescla
    try {
        const registrosNuvem = await carregarHistoricoDoUsuario();
        if (Array.isArray(registrosNuvem) && registrosNuvem.length > 0) {
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

// Salva questões importadas localmente como garantia extra contra F5
export function salvarQuestoesLocais(listaQuestoes) {
    if (!Array.isArray(listaQuestoes)) return;
    try {
        const atuais = carregarQuestoesLocais();
        const mapa = new Map(atuais.map(q => [String(q.id), q]));
        listaQuestoes.forEach(q => {
            if (q && q.id) mapa.set(String(q.id), q);
        });
        localStorage.setItem(CHAVE_QUESTOES_IMPORTADAS, JSON.stringify(Array.from(mapa.values())));
    } catch (e) {
        console.warn('Não foi possível salvar cache local de questões importadas:', e);
    }
}

export function carregarQuestoesLocais() {
    try {
        const bruto = localStorage.getItem(CHAVE_QUESTOES_IMPORTADAS);
        if (!bruto) return [];
        const lista = JSON.parse(bruto);
        return Array.isArray(lista) ? lista : [];
    } catch (e) {
        return [];
    }
}