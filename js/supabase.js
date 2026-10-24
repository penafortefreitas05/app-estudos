// ============================================================
// js/supabase.js - Conexão com o Banco de Dados na Nuvem
// ============================================================

// supabase-js 2.117.3 empacotado num arquivo só e servido pelo próprio site
// (antes vinha do esm.sh sem versão fixa: ~20 arquivos em cascata). Ver README > Dependências.
import { createClient } from './vendor/supabase-js-2.117.3.min.js';
import { normalizarQuestao } from './api.js';
import { gabaritoDe } from './ui.js';

const supabaseUrl = 'https://fghcoxferprkzsemicnw.supabase.co';
// Chave "anon": é pública por definição. Quem protege os dados é a RLS de cada tabela.
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaGNveGZlcnBya3pzZW1pY253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MDg2ODYsImV4cCI6MjEwODA4NDY4Nn0.o2LRgl3s3rL_tYsLE8Ujk_GLWVQj0fPwZv-bgtEP7i4';

// Instância única de conexão com o Supabase
export const supabaseClient = createClient(supabaseUrl, supabaseKey);
export const supabase = supabaseClient;

// A API do Supabase devolve no máximo 1000 linhas por consulta (Settings > API > Max Rows).
// Se esse valor for alterado no painel, ajuste aqui também.
const TAMANHO_PAGINA = 1000;

// Busca todas as linhas de uma consulta, de página em página.
// "montarConsulta" precisa devolver uma consulta NOVA a cada chamada, já com .order() definido.
async function buscarTodasAsPaginas(montarConsulta) {
    const todas = [];
    for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
        const { data, error } = await montarConsulta().range(inicio, inicio + TAMANHO_PAGINA - 1);
        if (error) throw error;
        const pagina = data || [];
        todas.push(...pagina);
        if (pagina.length < TAMANHO_PAGINA) break;
    }
    return todas;
}

/**
 * Registra o resultado da resolução de uma questão na base de dados
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
 * Apaga TODAS as linhas de historico_respostas do usuário logado (irreversível).
 * Exige RLS: política DELETE restrita a auth.uid() = user_id.
 */
export async function apagarHistoricoDoUsuario() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const user = session?.user;
    if (!user) {
        throw new Error("Você precisa estar logado para apagar o histórico da nuvem.");
    }

    const { error } = await supabaseClient
        .from('historico_respostas')
        .delete()
        .eq('user_id', user.id);

    if (error) throw error;
}

/**
 * Recupera TODO o histórico de resoluções do usuário logado (paginado, sem o corte de 1000 linhas)
 */
export async function carregarHistoricoDoUsuario() {
    try {
        const { data: { session }, error: erroAuth } = await supabaseClient.auth.getSession();
        const user = session?.user;

        if (erroAuth || !user) {
            return [];
        }

        // Só as colunas que o app usa: payload menor a cada abertura
        return await buscarTodasAsPaginas(() => supabaseClient
            .from('historico_respostas')
            .select('questao_id, acertou, resposta_usuario, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }));
    } catch (erro) {
        console.warn("Aviso ao carregar histórico do Supabase:", erro.message);
        return [];
    }
}

/**
 * Salva uma lista de questões importadas na tabela 'questoes' (a RLS só permite ao admin)
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
 * Puxa TODAS as questões do banco (paginado, sem o corte de 1000 linhas)
 */
export async function carregarTodasQuestoes() {
    try {
        const data = await buscarTodasAsPaginas(() => supabaseClient
            .from('questoes')
            .select('*')
            .order('id', { ascending: true }));

        return data.map((q, idx) => normalizarQuestao(q, idx));
    } catch (erro) {
        console.warn("Aviso ao buscar questões da nuvem:", erro.message);
        return [];
    }
}
