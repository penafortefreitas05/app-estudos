// ============================================================
// js/supabase.js - Conexão com o Banco de Dados na Nuvem
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { normalizarQuestao } from './api.js';
import { gabaritoDe } from './ui.js';

const supabaseUrl = 'https://fghcoxferprkzsemicnw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaGNveGZlcnBya3pzZW1pY253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MDg2ODYsImV4cCI6MjEwODA4NDY4Nn0.o2LRgl3s3rL_tYsLE8Ujk_GLWVQj0fPwZv-bgtEP7i4';

// Instância única de conexão com o Supabase
export const supabaseClient = createClient(supabaseUrl, supabaseKey);
export const supabase = supabaseClient;

/**
 * Regista o resultado da resolução de uma questão na base de dados
 */
export async function salvarRespostaNoHistorico({ questaoId, materia, banca, acertou, respostaEscolhida }) {
    try {
        const { data: { session }, error: erroAuth } = await supabaseClient.auth.getSession();
        const user = session?.user;

        if (erroAuth || !user) {
            return;
        }

        const { error } = await supabaseClient
            .from('historico_respostas')
            .insert([
                {
                    user_id: user.id,
                    questao_id: String(questaoId),
                    materia: materia || 'Geral',
                    banca: banca || 'Não informada',
                    acertou: Boolean(acertou),
                    resposta_usuario: String(respostaEscolhida)
                }
            ]);

        if (error) throw error;
    } catch (erro) {
        console.warn("Aviso ao gravar resolução no Supabase:", erro.message);
    }
}

/**
 * Recupera o histórico de resoluções gravado no Supabase para o usuário logado
 */
export async function carregarHistoricoDoUsuario() {
    try {
        const { data: { session }, error: erroAuth } = await supabaseClient.auth.getSession();
        const user = session?.user;

        if (erroAuth || !user) {
            return [];
        }

        const { data, error } = await supabaseClient
            .from('historico_respostas')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (erro) {
        console.warn("Aviso ao carregar histórico do Supabase:", erro.message);
        return [];
    }
}

/**
 * Salva uma lista de questões importadas na tabela 'questoes'
 */
export async function salvarQuestoesEmMassa(arrayDeQuestoes) {
    try {
        const payload = arrayDeQuestoes
            .filter(q => q && (q.pergunta || q.enunciado))
            .map((q, idx) => {
                const qNorm = normalizarQuestao({ ...q }, idx);
                const alternativasArray = Array.isArray(qNorm.alternativas)
                    ? qNorm.alternativas
                    : Object.values(qNorm.alternativas || {});
                const letraGabarito = gabaritoDe(qNorm) || 'A';

                return {
                    id: String(qNorm.id),
                    pergunta: qNorm.pergunta || qNorm.enunciado,
                    alternativas: alternativasArray,
                    resposta_correta: letraGabarito,
                    materia: qNorm.materia || 'Geral',
                    banca: qNorm.banca || 'Não informada',
                    orgao: qNorm.orgao || null,
                    tags: Array.isArray(qNorm.tags) ? qNorm.tags : []
                };
            });

        if (payload.length === 0) return;

        const { error } = await supabaseClient.from('questoes').upsert(payload);
        if (error) throw error;
    } catch (erro) {
        console.error("Erro ao salvar questões em massa no Supabase:", erro.message);
        throw erro;
    }
}

/**
 * Puxa todas as questões salvas no banco de dados para a tela
 */
export async function carregarTodasQuestoes() {
    try {
        const { data, error } = await supabaseClient
            .from('questoes')
            .select('*');

        if (error) throw error;

        return (data || []).map((q, idx) => normalizarQuestao(q, idx));
    } catch (erro) {
        console.warn("Aviso ao buscar questões da nuvem:", erro.message);
        return [];
    }
}