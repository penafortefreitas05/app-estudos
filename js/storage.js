// ============================================================
// js/storage.js - Gerenciamento Híbrido (Local / Supabase)
// ============================================================

import { supabase } from './supabase.js';
import { usuarioAtual } from './app.js';
import { showToast } from './notifications.js';

const CHAVE_HISTORICO = 'appEstudos_Historico';

// Lê o histórico (Tenta na Nuvem primeiro, senão cai pro Local)
export async function carregarHistorico() {
    let historicoLocal = {};
    
    // 1. Carrega do LocalStorage como base
    try {
        const dados = JSON.parse(localStorage.getItem(CHAVE_HISTORICO));
        if (dados && typeof dados === 'object' && !Array.isArray(dados)) {
            historicoLocal = dados;
        }
    } catch (e) {
        console.warn('Histórico local vazio ou ilegível.');
    }

    // 2. Se o usuário estiver logado, busca da nuvem (Supabase)
    if (usuarioAtual) {
        try {
            const { data, error } = await supabase
                .from('progresso_estudos')
                .select('historico')
                .eq('user_id', usuarioAtual.id)
                .single();

            if (data && data.historico) {
                // Mescla os dados locais com a nuvem
                historicoLocal = { ...historicoLocal, ...data.historico };
                // Salva a versão atualizada no local para funcionar offline
                localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historicoLocal));
            }
        } catch (err) {
            console.error("Erro ao buscar histórico da nuvem:", err);
        }
    }

    return historicoLocal;
}

// Salva o histórico (No Local e na Nuvem simultaneamente)
export async function salvarHistorico(historico) {
    // 1. Salva no LocalStorage sempre (garante o uso offline)
    try {
        localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico));
    } catch (e) {
        console.error('Falha ao salvar no LocalStorage.');
    }

    // 2. Se estiver logado, faz o UPSERT na Nuvem (Insere ou Atualiza)
    if (usuarioAtual) {
        try {
            const { error } = await supabase
                .from('progresso_estudos')
                .upsert(
                    { user_id: usuarioAtual.id, historico: historico },
                    { onConflict: 'user_id' } // Se já existir, ele atualiza
                );

            if (error) throw error;
            
        } catch (err) {
            console.error("Erro ao sincronizar com a nuvem:", err);
            // Um toast sutil apenas para debug
            showToast("Aguardando conexão para sincronizar dados...", "alerta", 2000);
        }
    }
}