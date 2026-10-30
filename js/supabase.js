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

function montarLinha(userId, { questaoId, materia, banca, acertou, respostaEscolhida, momento, confianca, gabarito }) {
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
    // Guardar o gabarito na própria resposta (U9) é o que permite mostrá-lo de novo depois
    // (revisão, outro aparelho) sem chamar o servidor outra vez — só pra quem já respondeu.
    if (gabarito) linha.gabarito = String(gabarito).toUpperCase();
    return linha;
}

// As colunas "confianca" e "gabarito" existem no banco? Enquanto o SQL não for rodado, o
// app segue sem elas (sem isso, toda resposta ficaria presa na fila por uma coluna inexistente).
let colunaConfiancaExiste = true;
let colunaGabaritoExiste = true;

function erroDeColunaConfianca(erro) {
    return Boolean(erro) && /confianca/i.test(`${erro.message || ''} ${erro.details || ''} ${erro.hint || ''}`);
}

function erroDeColunaGabarito(erro) {
    return Boolean(erro) && /\bgabarito\b/i.test(`${erro.message || ''} ${erro.details || ''} ${erro.hint || ''}`);
}

async function inserirLinhas(linhas) {
    let enviar = linhas;
    if (!colunaConfiancaExiste) enviar = enviar.map(({ confianca, ...resto }) => resto);
    if (!colunaGabaritoExiste) enviar = enviar.map(({ gabarito, ...resto }) => resto);

    const { error } = await supabaseClient.from('historico_respostas').insert(enviar);
    if (error) {
        if (colunaConfiancaExiste && erroDeColunaConfianca(error)) {
            colunaConfiancaExiste = false;
            console.warn("[FocoPro] Coluna 'confianca' ainda não existe no Supabase; enviando sem ela.");
            return inserirLinhas(linhas);
        }
        if (colunaGabaritoExiste && erroDeColunaGabarito(error)) {
            colunaGabaritoExiste = false;
            console.warn("[FocoPro] Coluna 'gabarito' ainda não existe no Supabase; enviando sem ela.");
            return inserirLinhas(linhas);
        }
        throw error;
    }
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

// "Apagar TUDO": favoritos/anotações pendentes não podem voltar para a nuvem depois de apagados
export function limparFilaFavoritosPendente() {
    gravarFilaFavoritos([]);
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
 * Apaga TODOS os favoritos/anotações do usuário logado na nuvem (irreversível).
 * Se a tabela ainda não existir no Supabase, não há nada para apagar lá: não trava o "Apagar TUDO".
 */
export async function apagarFavoritosDoUsuario() {
    if (!tabelaFavoritosExiste) return;

    const { data: { session } } = await supabaseClient.auth.getSession();
    const user = session?.user;
    if (!user) {
        throw new Error("Você precisa estar logado para apagar favoritos/anotações da nuvem.");
    }

    const { error } = await supabaseClient
        .from('favoritos_anotacoes')
        .delete()
        .eq('user_id', user.id);

    if (error && !erroDeTabelaFavoritos(error)) throw error;
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

    // Colunas opcionais (confianca, gabarito): monta a lista a partir do que ainda não falhou,
    // e desliga a que faltar, tentando de novo sem ela — no máximo 1 tentativa por coluna.
    const colunasBase = 'questao_id, acertou, resposta_usuario, created_at';
    function colunasParaSelecionar() {
        let cols = colunasBase;
        if (colunaConfiancaExiste) cols += ', confianca';
        if (colunaGabaritoExiste) cols += ', gabarito';
        return cols;
    }

    const buscarLinhas = async (aPartirDe) => {
        const buscar = (colunas) => buscarTodasAsPaginas(() => {
            let consulta = supabaseClient
                .from('historico_respostas')
                .select(colunas)
                .eq('user_id', user.id);
            if (aPartirDe) consulta = consulta.gt('created_at', aPartirDe);
            return consulta.order('created_at', { ascending: true });
        });
        for (let tentativa = 0; tentativa < 3; tentativa++) {
            try {
                return await buscar(colunasParaSelecionar());
            } catch (erro) {
                if (colunaConfiancaExiste && erroDeColunaConfianca(erro)) {
                    colunaConfiancaExiste = false;
                    continue;
                }
                if (colunaGabaritoExiste && erroDeColunaGabarito(erro)) {
                    colunaGabaritoExiste = false;
                    continue;
                }
                throw erro;
            }
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

// ---------- Favoritos e anotações pessoais na nuvem (U3) ----------
// Tabela 'favoritos_anotacoes': 1 linha por (usuário, questão), com um carimbo de hora
// PRÓPRIO para cada campo (favorito_em / anotacao_em). Ao reabrir em outro aparelho, quem
// tiver o carimbo mais novo em cada campo vence — dá pra favoritar no celular e escrever a
// anotação no computador sem um apagar o outro. Se a internet falhar na hora, a mudança
// fica numa fila local e é reenviada depois (mesma ideia da fila de historico_respostas).
const CHAVE_FILA_FAVORITOS = 'appEstudos_FilaFavoritosAnotacoes';

function lerFilaFavoritos() {
    try {
        const fila = JSON.parse(localStorage.getItem(CHAVE_FILA_FAVORITOS) || '[]');
        return Array.isArray(fila) ? fila : [];
    } catch (e) {
        return [];
    }
}

function gravarFilaFavoritos(fila) {
    try {
        if (fila.length) localStorage.setItem(CHAVE_FILA_FAVORITOS, JSON.stringify(fila.slice(-2000)));
        else localStorage.removeItem(CHAVE_FILA_FAVORITOS);
    } catch (e) { /* sem localStorage: a fila só não persiste */ }
}

// A tabela existe no Supabase? Enquanto o SQL não for rodado, favoritos e anotações
// continuam funcionando normalmente, só que sem sair deste aparelho.
let tabelaFavoritosExiste = true;

function erroDeTabelaFavoritos(erro) {
    return Boolean(erro) && /favoritos_anotacoes/i.test(`${erro?.message || ''} ${erro?.details || ''} ${erro?.hint || ''}`);
}

async function enviarUpsertFavorito(linha) {
    const { error } = await supabaseClient
        .from('favoritos_anotacoes')
        .upsert(linha, { onConflict: 'user_id,questao_id' });

    if (error) {
        if (erroDeTabelaFavoritos(error)) {
            tabelaFavoritosExiste = false;
            console.warn("[FocoPro] Tabela 'favoritos_anotacoes' ainda não existe no Supabase; favoritos e anotações continuam só neste aparelho por ora.");
            return;
        }
        throw error;
    }
}

let enviandoFilaFavoritos = false;

/**
 * Reenvia favoritos/anotações que ficaram pendentes (sem internet no momento, etc.).
 * Chamada ao carregar o histórico e quando o navegador volta a ficar online.
 */
export async function enviarFilaFavoritosPendente() {
    if (enviandoFilaFavoritos || !tabelaFavoritosExiste) return;
    const fila = lerFilaFavoritos();
    if (fila.length === 0) return;

    enviandoFilaFavoritos = true;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const user = session?.user;
        if (!user) return;

        const minhas = fila.filter(l => l.user_id === user.id);
        const outras = fila.filter(l => l.user_id !== user.id);
        if (minhas.length === 0) return;

        for (const linha of minhas) {
            await enviarUpsertFavorito(linha);
            if (!tabelaFavoritosExiste) {
                gravarFilaFavoritos([...outras, ...minhas]); // tabela ainda não existe: devolve tudo pra fila
                return;
            }
        }
        gravarFilaFavoritos(outras);
        console.info(`[FocoPro] ${minhas.length} favorito(s)/anotação(ões) pendente(s) enviados para a nuvem.`);
    } catch (erro) {
        console.warn("[FocoPro] Fila de favoritos/anotações continua pendente:", erro.message);
    } finally {
        enviandoFilaFavoritos = false;
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => enviarFilaFavoritosPendente());
}

async function salvarCampoFavoritoNaNuvem(questaoId, camposValor, campoCarimbo, momento) {
    let user = null;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        user = session?.user || null;
    } catch (e) { /* segue sem usuário */ }
    if (!user) return; // visitante: fica só no aparelho

    const linha = {
        user_id: user.id,
        questao_id: String(questaoId),
        ...camposValor,
        [campoCarimbo]: new Date(momento).toISOString()
    };

    try {
        await enviarUpsertFavorito(linha);
    } catch (erro) {
        console.warn("[FocoPro] Sem conexão para salvar na nuvem agora; tentando de novo mais tarde:", erro.message);
        gravarFilaFavoritos([...lerFilaFavoritos(), linha]);
    }
}

// Salva (ou desfaz) o favorito na nuvem, em segundo plano.
export function salvarFavoritoNaNuvem(questaoId, favorito, momento = Date.now()) {
    return salvarCampoFavoritoNaNuvem(questaoId, { favorito: Boolean(favorito) }, 'favorito_em', momento);
}

// Salva a anotação pessoal na nuvem, em segundo plano.
export function salvarAnotacaoNaNuvem(questaoId, anotacao, momento = Date.now()) {
    return salvarCampoFavoritoNaNuvem(questaoId, { anotacao: String(anotacao || '') }, 'anotacao_em', momento);
}

/**
 * Busca favoritos e anotações salvos na nuvem para o usuário logado.
 * Devolve um mapa { questaoId: { favorito, anotacao, favoritoEm, anotacaoEm } },
 * ou null (visitante, tabela ainda não existe, ou sem conexão agora).
 */
export async function carregarFavoritosEAnotacoes() {
    if (!tabelaFavoritosExiste) return null;

    let user = null;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        user = session?.user || null;
    } catch (e) { /* sem sessão */ }
    if (!user) return null;

    try {
        const linhas = await buscarTodasAsPaginas(() => supabaseClient
            .from('favoritos_anotacoes')
            .select('questao_id, favorito, anotacao, favorito_em, anotacao_em')
            .eq('user_id', user.id));

        const mapa = {};
        linhas.forEach(l => {
            mapa[String(l.questao_id)] = {
                favorito: Boolean(l.favorito),
                anotacao: l.anotacao || '',
                favoritoEm: l.favorito_em ? new Date(l.favorito_em).getTime() : 0,
                anotacaoEm: l.anotacao_em ? new Date(l.anotacao_em).getTime() : 0
            };
        });
        return mapa;
    } catch (erro) {
        if (erroDeTabelaFavoritos(erro)) {
            tabelaFavoritosExiste = false;
            console.warn("[FocoPro] Tabela 'favoritos_anotacoes' ainda não existe no Supabase; favoritos e anotações continuam só neste aparelho por ora.");
            return null;
        }
        console.warn("[FocoPro] Sem conexão com favoritos/anotações da nuvem:", erro.message);
        return null;
    }
}

// A tabela 'questoes_gabarito' existe e a coluna 'resposta_correta' de 'questoes' já é
// opcional? Enquanto a SQL do U9 não for rodada (as duas coisas vêm juntas nela), o gabarito
// continua indo para a coluna antiga em 'questoes' — nada quebra, nenhuma importação falha.
let tabelaGabaritoExiste = true;

function erroDeTabelaGabarito(erro) {
    return Boolean(erro) && /questoes_gabarito/i.test(`${erro?.message || ''} ${erro?.details || ''} ${erro?.hint || ''}`);
}

// Postgres 23502 = violação de NOT NULL: a coluna 'resposta_correta' ainda exige valor
// (a SQL do U9, que a torna opcional, não rodou ainda).
function erroDeColunaRespostaObrigatoria(erro) {
    return Boolean(erro) && erro.code === '23502' && /resposta_correta/i.test(`${erro?.message || ''} ${erro?.details || ''}`);
}

function comGabaritoEmQuestoes(payload, gabaritos) {
    const porId = new Map(gabaritos.map(g => [g.questao_id, g.resposta_correta]));
    return payload.map(q => ({ ...q, resposta_correta: porId.get(q.id) }));
}

// Coluna 'nivel' (níveis de questão). Enquanto a SQL dos níveis não rodar, importar questões
// de prova (nível 3, o padrão) segue funcionando sem a coluna; já questões de outro nível são
// recusadas com aviso claro — gravá-las sem o nível as faria virar "Avançado" sem ninguém ver.
let colunaNivelExiste = true;
function erroDeColunaNivel(erro) {
    return Boolean(erro) && /\bnivel\b/i.test(`${erro?.message || ''} ${erro?.details || ''} ${erro?.hint || ''}`);
}

function semColunaNivel(payload) {
    if (payload.some(q => q.nivel !== undefined && q.nivel !== 3)) {
        throw new Error("O banco ainda não tem a coluna 'nivel'. Rode a SQL dos níveis no Supabase antes de importar questões Iniciante, Intermediário ou Especialista.");
    }
    return payload.map(({ nivel, ...resto }) => resto);
}

async function upsertQuestoesComPlanoB(payload, gabaritos) {
    if (!colunaNivelExiste) payload = semColunaNivel(payload);
    const { error } = await supabaseClient.from('questoes').upsert(payload);
    if (error) {
        if (colunaNivelExiste && erroDeColunaNivel(error)) {
            colunaNivelExiste = false;
            console.warn("[FocoPro] Coluna 'nivel' ainda não existe em 'questoes' (rode a SQL dos níveis).");
            return upsertQuestoesComPlanoB(payload, gabaritos);
        }
        if (tabelaGabaritoExiste && erroDeColunaRespostaObrigatoria(error)) {
            tabelaGabaritoExiste = false;
            console.warn("[FocoPro] Coluna 'resposta_correta' de 'questoes' ainda exige valor (SQL do U9 não rodou); salvando do jeito antigo por ora.");
            return upsertQuestoesComPlanoB(comGabaritoEmQuestoes(payload, gabaritos), gabaritos);
        }
        throw error;
    }

    if (!tabelaGabaritoExiste) return; // plano B: o gabarito já foi em 'questoes', não precisa da tabela nova

    const { error: erroGabarito } = await supabaseClient.from('questoes_gabarito').upsert(gabaritos);
    if (erroGabarito) {
        if (erroDeTabelaGabarito(erroGabarito)) {
            tabelaGabaritoExiste = false;
            console.warn("[FocoPro] Tabela 'questoes_gabarito' ainda não existe no Supabase; gabarito reenviado para 'questoes' por ora (rode a SQL do U9).");
            return upsertQuestoesComPlanoB(comGabaritoEmQuestoes(payload, gabaritos), gabaritos);
        }
        throw erroGabarito;
    }
}

/**
 * Salva uma lista de questões importadas na tabela 'questoes' (a RLS só permite ao admin).
 * O gabarito (U9) vai para 'questoes_gabarito', uma tabela separada que só o admin lê —
 * 'questoes' não leva mais a resposta certa para quem só está estudando.
 */
export async function salvarQuestoesEmMassa(arrayDeQuestoes) {
    try {
        const gabaritos = [];
        // Questão sem gabarito não entra (antes virava "A" silenciosamente). A tela de
        // importação já barra isso antes; aqui é a segunda trava.
        const payload = arrayDeQuestoes
            .filter(q => q && (q.pergunta || q.enunciado))
            .map((q, idx) => normalizarQuestao({ ...q }, idx))
            .filter(qNorm => {
                if (qNorm.gabarito) return true;
                console.warn(`[FocoPro] Questão ${qNorm.id} sem gabarito: não foi importada.`);
                return false;
            })
            .map(qNorm => {
                const alternativasArray = Array.isArray(qNorm.alternativas)
                    ? qNorm.alternativas
                    : Object.values(qNorm.alternativas || {});
                const letraGabarito = gabaritoDe(qNorm);
                const idQuestao = String(qNorm.id);
                gabaritos.push({ questao_id: idQuestao, resposta_correta: letraGabarito });

                const linha = {
                    id: idQuestao,
                    pergunta: qNorm.pergunta || qNorm.enunciado,
                    alternativas: alternativasArray,
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
                    laboratorio: qNorm.laboratorio || null,
                    nivel: qNorm.nivel
                };
                // Plano B já ativo (de uma tentativa anterior nesta mesma sessão): manda do jeito antigo direto
                if (!tabelaGabaritoExiste) linha.resposta_correta = letraGabarito;
                return linha;
            });

        if (payload.length === 0) return;

        await upsertQuestoesComPlanoB(payload, gabaritos);
    } catch (erro) {
        console.error("Erro ao salvar questões em massa no Supabase:", erro.message);
        throw erro;
    }
}

// ---------- Correção de resposta no servidor (U9) ----------
// O RPC 'verificar_resposta' lê o gabarito de 'questoes_gabarito' (RLS: só o admin lê direto)
// e só devolve a letra depois de receber a resposta do usuário — ninguém baixa o gabarito de
// uma questão que ainda não respondeu. PGRST202 = PostgREST não achou a função (SQL do U9
// ainda não rodou): nesse caso corrige no navegador, com o gabarito que a questão ainda traz
// (plano B da transição — para de funcionar sozinho quando a coluna antiga for esvaziada).
function erroDeRpcInexistente(erro) {
    return Boolean(erro) && (erro.code === 'PGRST202' || /verificar_resposta/i.test(`${erro?.message || ''} ${erro?.hint || ''}`));
}

// Erros com semGabarito = true: a questão não tem gabarito em lugar nenhum (problema do dado,
// não da conexão). Os outros erros são de conexão/servidor e valem "tente de novo".
export async function corrigirResposta(questao, respostaEscolhida) {
    let motivo;
    try {
        const { data, error } = await supabaseClient.rpc('verificar_resposta', {
            p_questao_id: String(questao.id),
            p_resposta: String(respostaEscolhida)
        });
        if (error) throw error;
        const linha = Array.isArray(data) ? data[0] : data;
        if (linha && linha.gabarito) {
            return { acertou: Boolean(linha.acertou), gabarito: String(linha.gabarito).toUpperCase() };
        }
        motivo = 'nao-encontrada'; // função existe, mas essa questão não está em questoes_gabarito
    } catch (erro) {
        if (!erroDeRpcInexistente(erro)) {
            // Internet caiu, servidor fora, sessão expirada...: NÃO corrige com gabarito local.
            // Quem chama mostra "tente de novo" — corrigir errado é pior do que esperar.
            throw erro;
        }
        motivo = 'rpc-inexistente';
    }

    // Plano B (só nos dois casos acima): usa o gabarito que a questão ainda traz da coluna
    // antiga. Ele é real (não existe mais padrão "A" na normalização) e deixa de existir
    // sozinho quando a Fase 2 do U9 apagar a coluna.
    const gabaritoLocal = String(questao.gabarito || questao.resposta_correta || '').trim();
    if (gabaritoLocal) {
        const gabarito = gabaritoDe(questao);
        return { acertou: String(respostaEscolhida).trim().toUpperCase() === gabarito, gabarito };
    }

    const erro = new Error(motivo === 'nao-encontrada'
        ? "Esta questão está sem gabarito cadastrado."
        : "Não foi possível corrigir esta resposta agora.");
    erro.semGabarito = motivo === 'nao-encontrada';
    throw erro;
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

// ---------- Reportar problema numa questão (U5) ----------
// Tabela 'reportes_questao' (SQL em docs/sql/u5-reportes-questao.sql). Cada pessoa vê só os
// próprios reportes; o admin vê e fecha todos (RLS).
// Os erros viram um objeto simples {ok, motivo} para a tela mostrar a mensagem certa:
// 'sem-tabela' (SQL ainda não rodou), 'duplicado' (já reportou isso), 'sem-login' ou 'rede'.
function motivoDeErroReporte(erro) {
    if (!erro) return 'rede';
    if (erro.code === '23505') return 'duplicado';
    if (erro.code === '42P01' || erro.code === 'PGRST205' || /reportes_questao/i.test(`${erro.message || ''}`)) return 'sem-tabela';
    if (erro.code === '42501') return 'sem-login';
    return 'rede';
}

export async function enviarReporteDeQuestao({ questaoId, tipo, comentario }) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return { ok: false, motivo: 'sem-login' };
    const { error } = await supabaseClient.from('reportes_questao').insert({
        user_id: session.user.id,
        questao_id: String(questaoId),
        tipo,
        comentario: String(comentario || '').trim().slice(0, 600)
    });
    return error ? { ok: false, motivo: motivoDeErroReporte(error) } : { ok: true };
}

// Só o admin enxerga mais que os próprios (a RLS decide); a tela só oferece isso ao admin.
export async function listarReportesAbertos() {
    const { data, error } = await supabaseClient
        .from('reportes_questao')
        .select('id, questao_id, tipo, comentario, criado_em')
        .eq('status', 'aberto')
        .order('criado_em', { ascending: true })
        .limit(500);
    return error ? { ok: false, motivo: motivoDeErroReporte(error) } : { ok: true, reportes: data || [] };
}

export async function fecharReporte(id, status) {
    const { error } = await supabaseClient
        .from('reportes_questao')
        .update({ status, resolvido_em: new Date().toISOString() })
        .eq('id', id);
    return error ? { ok: false, motivo: motivoDeErroReporte(error) } : { ok: true };
}

// ---------- Backup do banco de questões (só o admin; a RLS barra os demais) ----------
// Baixa tudo que é conteúdo: questoes, questoes_gabarito e reportes_questao. Cada tabela
// que falhar vira um aviso no próprio arquivo, sem derrubar as outras.
export async function exportarBackupDoBanco() {
    const tabelas = { questoes: 'id', questoes_gabarito: 'questao_id', reportes_questao: 'id' };
    const backup = { gerado_em: new Date().toISOString(), tabelas: {}, avisos: [] };
    for (const [tabela, ordem] of Object.entries(tabelas)) {
        try {
            backup.tabelas[tabela] = await buscarTodasAsPaginas(() => supabaseClient
                .from(tabela).select('*').order(ordem, { ascending: true }));
        } catch (e) {
            backup.tabelas[tabela] = [];
            backup.avisos.push(`${tabela}: ${e?.message || 'falhou'}`);
        }
    }
    return backup;
}


/**
 * Respostas dos últimos N dias (para a tela "Meu dia").
 * Devolve { linhas: [{questao_id, acertou, created_at}], jaVistas: Set de questao_id que já tinham
 * resposta ANTES do período } — é isso que separa "questão nova" de "revisão".
 * Devolve null sem login ou sem conexão.
 */
export async function carregarRespostasRecentes(dias = 7) {
    let user = null;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        user = session?.user || null;
    } catch (e) { /* sem sessão */ }
    if (!user) return null;

    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    inicio.setDate(inicio.getDate() - (dias - 1));
    const inicioISO = inicio.toISOString();

    try {
        const linhas = await buscarTodasAsPaginas(() => supabaseClient
            .from('historico_respostas')
            .select('questao_id, acertou, created_at')
            .eq('user_id', user.id)
            .gte('created_at', inicioISO)
            .order('created_at', { ascending: true }));

        const ids = [...new Set(linhas.map(l => String(l.questao_id)))];
        const jaVistas = new Set();
        for (let i = 0; i < ids.length; i += 80) {
            const { data, error } = await supabaseClient
                .from('historico_respostas')
                .select('questao_id')
                .eq('user_id', user.id)
                .lt('created_at', inicioISO)
                .in('questao_id', ids.slice(i, i + 80))
                .limit(1000);
            if (error) throw error;
            (data || []).forEach(l => jaVistas.add(String(l.questao_id)));
        }
        return { linhas, jaVistas };
    } catch (erro) {
        console.warn('[FocoPro] Não foi possível ler as respostas recentes:', erro.message);
        return null;
    }
}
