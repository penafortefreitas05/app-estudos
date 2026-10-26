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

// ---------- Gravação de respostas (com fila para quando a internet falhar) ----------
// Toda resposta vira uma linha em historico_respostas. Se o envio falhar (sem sinal, voo,
// Supabase fora do ar), a linha vai para uma fila no aparelho e é reenviada depois,
// com a data original da resposta. Assim nenhuma resposta se perde da nuvem.
const CHAVE_FILA_NUVEM = 'appEstudos_FilaNuvem';

function lerFila() {
    try {
        const fila = JSON.parse(localStorage.getItem(CHAVE_FILA_NUVEM) || '[]');
        return Array.isArray(fila) ? fila : [];
    } catch (e) {
        return [];
    }
}

function gravarFila(fila) {
    try {
        if (fila.length) localStorage.setItem(CHAVE_FILA_NUVEM, JSON.stringify(fila.slice(-5000)));
        else localStorage.removeItem(CHAVE_FILA_NUVEM);
    } catch (e) { /* sem localStorage: a fila só não persiste */ }
}

function montarLinha(userId, { questaoId, materia, banca, acertou, respostaEscolhida, momento, confianca }) {
    const linha = {
        user_id: userId,
        questao_id: String(questaoId),
        materia: materia || 'Geral',
        banca: banca || 'Não informada',
        acertou: Boolean(acertou),
        resposta_usuario: String(respostaEscolhida),
        created_at: new Date(momento || Date.now()).toISOString()
    };
    if (confianca === 'certeza' || confianca === 'duvida') linha.confianca = confianca;
    return linha;
}

// A coluna "confianca" existe no banco? Enquanto o SQL não for rodado, o app segue sem ela
// (sem isso, toda resposta ficaria presa na fila offline por causa de uma coluna inexistente).
let colunaConfiancaExiste = true;

function erroDeColunaConfianca(erro) {
    return Boolean(erro) && /confianca/i.test(`${erro.message || ''} ${erro.details || ''} ${erro.hint || ''}`);
}

async function inserirLinhas(linhas) {
    const enviar = colunaConfiancaExiste
        ? linhas
        : linhas.map(({ confianca, ...resto }) => resto);
    const { error } = await supabaseClient.from('historico_respostas').insert(enviar);
    if (error && colunaConfiancaExiste && erroDeColunaConfianca(error)) {
        colunaConfiancaExiste = false;
        console.warn("[FocoPro] Coluna 'confianca' ainda não existe no Supabase; enviando sem ela.");
        return inserirLinhas(linhas);
    }
    if (error) throw error;
}

/**
 * Grava várias respostas de uma vez (simulado) ou uma só (modo estudo).
 * Cada item: { questaoId, materia, banca, acertou, respostaEscolhida, momento? }
 * Devolve true se tudo foi para a nuvem agora; false se ficou na fila (ou se não há login).
 */
export async function salvarRespostasEmLote(respostas) {
    if (!Array.isArray(respostas) || respostas.length === 0) return true;

    let user = null;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        user = session?.user || null;
    } catch (e) { /* segue sem usuário */ }
    if (!user) return false; // visitante: só o histórico local

    const linhas = respostas.map(r => montarLinha(user.id, r));
    try {
        await inserirLinhas(linhas);
        enviarFilaPendente(); // aproveita que a conexão está boa
        return true;
    } catch (erro) {
        console.warn("[FocoPro] Sem conexão com a nuvem; respostas guardadas para reenviar:", erro.message);
        gravarFila([...lerFila(), ...linhas]);
        return false;
    }
}

export async function salvarRespostaNoHistorico(resposta) {
    return salvarRespostasEmLote([resposta]);
}

let enviandoFila = false;

/**
 * Reenvia as respostas que ficaram na fila. Só manda as do usuário logado agora.
 * Chamada ao abrir o app, ao fazer login e quando o navegador volta a ficar online.
 */
export async function enviarFilaPendente() {
    if (enviandoFila) return;
    const fila = lerFila();
    if (fila.length === 0) return;

    enviandoFila = true;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const user = session?.user;
        if (!user) return;

        const minhas = fila.filter(l => l.user_id === user.id);
        const outras = fila.filter(l => l.user_id !== user.id);
        if (minhas.length === 0) return;

        await inserirLinhas(minhas);
        gravarFila(outras);
        console.info(`[FocoPro] ${minhas.length} resposta(s) pendente(s) enviadas para a nuvem.`);
    } catch (erro) {
        console.warn("[FocoPro] Fila de respostas continua pendente:", erro.message);
    } finally {
        enviandoFila = false;
    }
}

// "Apagar TUDO": respostas pendentes não podem voltar para a nuvem depois de apagadas
export function limparFilaPendente() {
    gravarFila([]);
}

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => enviarFilaPendente());
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
 * Busca só o que mudou desde a última abertura (item 14 do roadmap).
 * cache: { userId, cursor (created_at da última linha já lida), total (linhas já lidas) } ou null.
 * Devolve:
 *   { modo: 'incremental', linhas: [novas], total, userId }  -> aplicar as novas sobre o resumo guardado
 *   { modo: 'completo',    linhas: [todas], total, userId }  -> refazer o resumo do zero
 *   null                                                      -> sem login ou sem conexão (usar o local)
 * Conferência: o total de linhas na nuvem precisa bater com (já lidas + novas). Se não bater
 * (resposta offline de outro aparelho chegou com data antiga, histórico apagado etc.), baixa tudo.
 */
export async function carregarHistoricoIncremental(cache) {
    let user = null;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        user = session?.user || null;
    } catch (e) { /* sem sessão */ }
    if (!user) return null;

    const colunasCompletas = 'questao_id, acertou, resposta_usuario, created_at, confianca';
    const colunasSemConfianca = 'questao_id, acertou, resposta_usuario, created_at';

    const buscarLinhas = async (aPartirDe) => {
        const buscar = (colunas) => buscarTodasAsPaginas(() => {
            let consulta = supabaseClient
                .from('historico_respostas')
                .select(colunas)
                .eq('user_id', user.id);
            if (aPartirDe) consulta = consulta.gt('created_at', aPartirDe);
            return consulta.order('created_at', { ascending: true });
        });
        if (!colunaConfiancaExiste) return buscar(colunasSemConfianca);
        try {
            return await buscar(colunasCompletas);
        } catch (erro) {
            if (!erroDeColunaConfianca(erro)) throw erro;
            colunaConfiancaExiste = false;
            return buscar(colunasSemConfianca);
        }
    };

    try {
        const cacheValido = cache && cache.userId === user.id && cache.cursor && Number.isFinite(cache.total);
        if (cacheValido) {
            // As duas consultas saem juntas: as linhas novas e a contagem total (só o número, sem dados)
            const [novas, contagem] = await Promise.all([
                buscarLinhas(cache.cursor),
                supabaseClient
                    .from('historico_respostas')
                    .select('questao_id', { count: 'exact', head: true })
                    .eq('user_id', user.id)
            ]);
            if (contagem.error) throw contagem.error;
            if (contagem.count === cache.total + novas.length) {
                return { modo: 'incremental', linhas: novas, total: contagem.count, userId: user.id };
            }
            console.info('[FocoPro] Histórico da nuvem mudou fora da ordem; recarregando tudo.');
        }
        const todas = await buscarLinhas(null);
        return { modo: 'completo', linhas: todas, total: todas.length, userId: user.id };
    } catch (erro) {
        console.warn('[FocoPro] Sem conexão com o histórico da nuvem:', erro.message);
        return null;
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
                    tags: Array.isArray(qNorm.tags) ? qNorm.tags : [],
                    explicacao: qNorm.explicacao || null,
                    assunto: qNorm.assunto || null,
                    ano: qNorm.ano ?? null,
                    cargo: qNorm.cargo || null,
                    origem: qNorm.origem || null,
                    fonte: qNorm.fonte || null,
                    tipo: qNorm.tipo || null,
                    versao_referencia: qNorm.versao_referencia || null,
                    laboratorio: qNorm.laboratorio || null
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
// Lança o erro em caso de falha: quem chama (app.js) mostra o aviso com "Tentar de novo".
// (Antes devolvia [] e o app não tinha como diferenciar "banco vazio" de "sem conexão".)
export async function carregarTodasQuestoes() {
    const data = await buscarTodasAsPaginas(() => supabaseClient
        .from('questoes')
        .select('*')
        .order('id', { ascending: true }));

    return data.map((q, idx) => normalizarQuestao(q, idx));
}
