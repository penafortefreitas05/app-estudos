// ============================================================
// js/supabase.js - Conexão com o Banco de Dados na Nuvem
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://fghcoxferprkzsemicnw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaGNveGZlcnBya3pzZW1pY253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MDg2ODYsImV4cCI6MjEwODA4NDY4Nn0.o2LRgl3s3rL_tYsLE8Ujk_GLWVQj0fPwZv-bgtEP7i4';

// Instância única de conexão com o Supabase
export const supabaseClient = createClient(supabaseUrl, supabaseKey);
export const supabase = supabaseClient;

/**
 * Regista o resultado da resolução de uma questão na base de dados
 * @param {Object} dadosResposta
 * @param {string} dadosResposta.questaoId - Identificador único da questão
 * @param {string} dadosResposta.materia - Disciplina associada
 * @param {string} dadosResposta.banca - Banca examinadora
 * @param {boolean} dadosResposta.acertou - Se o utilizador acertou ou errou
 * @param {string} dadosResposta.respostaEscolhida - Opção selecionada pelo utilizador
 */
export async function salvarRespostaNoHistorico({ questaoId, materia, banca, acertou, respostaEscolhida }) {
    try {
        // Obtém a sessão do utilizador atualmente autenticado
        const { data: { user }, error: erroAuth } = await supabaseClient.auth.getUser();

        if (erroAuth || !user) {
            console.warn("Utilizador não autenticado. A resposta não foi gravada na base de dados.");
            return;
        }

        // Insere o registo na tabela historico_respostas
        const { data, error } = await supabaseClient
            .from('historico_respostas')
            .insert([
                {
                    user_id: user.id,
                    questao_id: String(questaoId),
                    materia: materia || 'Geral',
                    banca: banca || 'Não informada',
                    acertou: acertou,
                    resposta_usuario: String(respostaEscolhida)
                }
            ]);

        if (error) {
            throw error;
        }

        console.log("Resposta persistida no Supabase com sucesso.");
    } catch (erro) {
        console.error("Erro ao gravar resolução no Supabase:", erro.message);
    }
}

/**
 * Recupera o histórico de resoluções gravado no Supabase para o usuário logado
 */
export async function carregarHistoricoDoUsuario() {
    try {
        const { data: { user }, error: erroAuth } = await supabaseClient.auth.getUser();
        
        if (erroAuth || !user) {
            return [];
        }

        const { data, error } = await supabaseClient
            .from('historico_respostas')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        console.log(`Histórico carregado com sucesso: ${data.length} registros encontrados.`);
        return data;
    } catch (erro) {
        console.error("Erro ao carregar histórico do Supabase:", erro.message);
        return [];
    }
}