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

// ---------- Tempo limite das chamadas à nuvem (A01) ----------
// Em wifi sem internet (navio), o navegador diz "online" e cada chamada ficava esperando a rede
// desistir, sem prazo. Agora toda chamada ao Supabase tem prazo: 8 s para o servidor começar a
// responder e mais 30 s para a resposta terminar de chegar. Estourou, a chamada falha como
// "sem conexão" e o app segue com o que tem no aparelho. A função da IA (functions/v1) fica de
// fora: ela demora de propósito e não participa da abertura.
const LIMITE_RESPOSTA_MS = 8000;
const LIMITE_CORPO_MS = 30000;

function fetchComLimite(recurso, opcoes = {}) {
    const url = typeof recurso === 'string' ? recurso : (recurso && recurso.url) || '';
    if (url.includes('/functions/v1/') || typeof AbortController === 'undefined') return fetch(recurso, opcoes);
    const controle = new AbortController();
    const deFora = opcoes.signal; // quem chamou também pode cancelar
    const repassar = () => controle.abort();
    if (deFora) {
        if (deFora.aborted) controle.abort();
        else deFora.addEventListener('abort', repassar, { once: true });
    }
    let relogio = setTimeout(() => controle.abort(), LIMITE_RESPOSTA_MS);
    return fetch(recurso, { ...opcoes, signal: controle.signal }).then(
        (resposta) => {
            clearTimeout(relogio);
            relogio = setTimeout(() => controle.abort(), LIMITE_CORPO_MS);
            return resposta;
        },
        (erro) => { clearTimeout(relogio); throw erro; }
    );
}

// Instância única de conexão com o Supabase
export const supabaseClient = createClient(supabaseUrl, supabaseKey, { global: { fetch: fetchComLimite } });

// Teste rápido de rede, feito uma vez na abertura: o servidor responde alguma coisa em até `limiteMs`?
// Qualquer resposta serve (até erro HTTP): o que interessa é saber se há caminho até a nuvem.
// 'no-cors': um pedido simples, sem cabeçalhos extras, só para ver se chega.
export async function nuvemResponde(limiteMs = 6000) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    if (typeof AbortController === 'undefined') return true;
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), limiteMs);
    try {
        await fetch(`${supabaseUrl}/auth/v1/health`, { mode: 'no-cors', cache: 'no-store', signal: controle.signal });
        return true;
    } catch (e) {
        return false;
    } finally {
        clearTimeout(relogio);
    }
}
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

// Id local de cada linha da fila (A03). Não vai para o banco: serve para tirar da fila exatamente
// o que foi confirmado e para não reenviar o que outra aba já enviou.
function novoIdLocal() {
    try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* cai no plano B */ }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function montarLinha(userId, { questaoId, materia, banca, acertou, respostaEscolhida, momento, confianca, gabarito }) {
    const linha = {
        _lid: novoIdLocal(),
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
    // _lid e _t são controles da fila local: nunca vão para o banco
    let enviar = linhas.map(({ _lid, _t, ...resto }) => resto);
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

// ---------- Pacote offline ----------
// Gabaritos baixados (questaoId -> resposta_correta), usados só quando a correção pelo servidor
// não responde (sem internet). Com internet, o servidor continua sendo quem corrige.
let gabaritosOffline = null;
export function definirGabaritosOffline(mapa) { gabaritosOffline = mapa && Object.keys(mapa).length ? mapa : null; }
export const temGabaritosOffline = () => Boolean(gabaritosOffline);

// Usuário conhecido neste aparelho (logado agora ou guardado, com o app aberto sem rede). Se a
// sessão não puder ser confirmada (sem internet, login vencido), respostas, favoritos e anotações
// vão para a fila com o id dele e sobem quando a sessão for renovada.
let usuarioOfflineId = null;
export function definirUsuarioOffline(id) { usuarioOfflineId = id || null; }

// Baixa todas as questões e todos os gabaritos. onProgresso(texto) opcional.
export async function baixarPacoteOffline(onProgresso = () => {}) {
    onProgresso('Baixando as questões...');
    const questoes = await buscarTodasAsPaginas(() => supabaseClient.from('questoes').select('*').order('id', { ascending: true }));
    onProgresso(`Baixando os gabaritos (${questoes.length} questões)...`);
    const gabaritos = {};
    for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
        const { data, error } = await supabaseClient.rpc('baixar_gabaritos', { p_offset: inicio, p_limite: TAMANHO_PAGINA });
        if (error) throw error;
        (data || []).forEach(l => { gabaritos[String(l.questao_id)] = String(l.resposta_correta); });
        if (!data || data.length < TAMANHO_PAGINA) break;
    }
    return { baixadoEm: new Date().toISOString(), questoes, gabaritos };
}

/**
 * Grava várias respostas de uma vez (simulado) ou uma só (modo estudo).
 * Cada item: { questaoId, materia, banca, acertou, respostaEscolhida, momento? }
 * Devolve true se tudo foi para a nuvem agora; false se ficou na fila (ou se não há login).
 */
export async function salvarRespostasEmLote(respostas) {
    if (!Array.isArray(respostas) || respostas.length === 0) return true;

    let user = null;
    if (usuarioOfflineId && typeof navigator !== 'undefined' && navigator.onLine === false) {
        gravarFila([...lerFila(), ...respostas.map(r => montarLinha(usuarioOfflineId, r))]);
        return false; // sem internet: direto para a fila, sem esperar a sessão
    }
    try {
        // Sem internet e com login vencido, getSession pode demorar ~27 s: espera no máximo 4 s
        const { data: { session } } = await Promise.race([
            supabaseClient.auth.getSession(),
            new Promise((_, rejeita) => setTimeout(() => rejeita(new Error('sessão demorou')), 4000))
        ]);
        user = session?.user || null;
    } catch (e) { /* segue sem usuário */ }
    if (!user && usuarioOfflineId) {
        // App aberto sem rede com o login salvo: guarda na fila; sobe quando a conexão voltar
        gravarFila([...lerFila(), ...respostas.map(r => montarLinha(usuarioOfflineId, r))]);
        return false;
    }
    if (!user) return false; // visitante: só o histórico local

    const linhas = respostas.map(r => montarLinha(user.id, r));
    try {
        await inserirLinhas(linhas);
        enviarFilaPendente(); // aproveita que a conexão está boa
        return true;
    } catch (erro) {
        console.warn("[FocoPro] Sem conexão com a nuvem; respostas guardadas para reenviar:", erro.message);
        // _t: o envio saiu e não foi confirmado. Pode ter chegado ao servidor: o reenvio confere antes.
        gravarFila([...lerFila(), ...linhas.map(l => ({ ...l, _t: 1 }))]);
        return false;
    }
}

export async function salvarRespostaNoHistorico(resposta) {
    return salvarRespostasEmLote([resposta]);
}

let enviandoFila = false;
const TAMANHO_LOTE_FILA = 200;

// Ids locais já confirmados pela nuvem (os últimos 1000). Se duas janelas do app (PWA e aba)
// lerem a mesma fila, a segunda vê aqui o que a primeira já enviou e não manda de novo.
const CHAVE_FILA_CONFIRMADOS = 'appEstudos_FilaNuvemConfirmados';

function lerConfirmados() {
    try {
        const v = JSON.parse(localStorage.getItem(CHAVE_FILA_CONFIRMADOS) || '[]');
        return new Set(Array.isArray(v) ? v : []);
    } catch (e) {
        return new Set();
    }
}

// Confirmado pela nuvem: anota o id e tira da fila SÓ essas linhas. A fila é relida na hora:
// resposta que entrou nela durante o envio continua lá (antes era apagada junto).
function confirmarEnvio(ids) {
    if (!ids.length) return;
    try {
        const todos = [...lerConfirmados(), ...ids].slice(-1000);
        localStorage.setItem(CHAVE_FILA_CONFIRMADOS, JSON.stringify(todos));
    } catch (e) { /* sem espaço: a fila abaixo ainda é atualizada */ }
    const enviados = new Set(ids);
    gravarFila(lerFila().filter(l => !enviados.has(l._lid)));
}

// Marca "envio saiu, ainda sem confirmação" antes de mandar. Se a resposta do servidor se perder
// (rede caiu no meio), a próxima tentativa confere na nuvem antes de mandar de novo.
function marcarTentativa(ids) {
    const marcar = new Set(ids);
    gravarFila(lerFila().map(l => (marcar.has(l._lid) && !l._t ? { ...l, _t: 1 } : l)));
}

const chaveDaLinha = (l) => `${l.questao_id}|${new Date(l.created_at).getTime()}`;

// Quais destas linhas já estão na nuvem (mesma questão, mesmo instante)? Só leitura.
// Se a consulta falhar, lança o erro: sem conferir, nada duvidoso é reenviado.
async function chavesJaNaNuvem(userId, linhas) {
    const tempos = linhas.map(l => new Date(l.created_at).getTime()).filter(Number.isFinite);
    if (!tempos.length) return new Set();
    const de = new Date(tempos.reduce((a, b) => Math.min(a, b))).toISOString();
    const ate = new Date(tempos.reduce((a, b) => Math.max(a, b))).toISOString();
    const naNuvem = await buscarTodasAsPaginas(() => supabaseClient
        .from('historico_respostas')
        .select('questao_id, created_at')
        .eq('user_id', userId)
        .gte('created_at', de)
        .lte('created_at', ate)
        .order('created_at', { ascending: true }));
    return new Set(naNuvem.map(chaveDaLinha));
}

// Uma janela do app por vez mexe na fila (PWA instalado + aba do navegador abertos juntos).
// Navegador sem essa trava: segue só com a trava desta janela (enviandoFila).
function comTravaEntreJanelas(nome, fazer) {
    if (typeof navigator !== 'undefined' && navigator.locks && navigator.locks.request) {
        return navigator.locks.request(nome, { ifAvailable: true }, (trava) => (trava ? fazer() : undefined));
    }
    return fazer();
}

async function enviarFilaAgora() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const user = session?.user;
    if (!user) return;

    // A fila é lida DEPOIS de esperar a sessão (antes era lida antes, e o que entrava nesse
    // intervalo era apagado). Linhas de versões antigas ganham id local e a marca de "conferir".
    let fila = lerFila();
    if (fila.some(l => !l._lid)) {
        fila = fila.map(l => (l._lid ? l : { ...l, _lid: novoIdLocal(), _t: 1 }));
        gravarFila(fila);
    }
    let minhas = fila.filter(l => l.user_id === user.id);
    if (minhas.length === 0) return;

    // 1. O que outra janela já enviou só sai da fila
    const confirmados = lerConfirmados();
    const jaEnviadas = minhas.filter(l => confirmados.has(l._lid));
    if (jaEnviadas.length) {
        confirmarEnvio(jaEnviadas.map(l => l._lid));
        minhas = minhas.filter(l => !confirmados.has(l._lid));
    }

    // 2. Envio anterior sem confirmação: confere na nuvem para não gravar a mesma resposta 2 vezes
    const duvidosas = minhas.filter(l => l._t);
    if (duvidosas.length) {
        const naNuvem = await chavesJaNaNuvem(user.id, duvidosas);
        const repetidas = duvidosas.filter(l => naNuvem.has(chaveDaLinha(l)));
        if (repetidas.length) {
            const ids = new Set(repetidas.map(l => l._lid));
            confirmarEnvio([...ids]);
            minhas = minhas.filter(l => !ids.has(l._lid));
        }
    }

    // 3. Envia em lotes; cada lote confirmado sai da fila na hora
    let enviadas = 0;
    for (let i = 0; i < minhas.length; i += TAMANHO_LOTE_FILA) {
        const lote = minhas.slice(i, i + TAMANHO_LOTE_FILA);
        const ids = lote.map(l => l._lid);
        marcarTentativa(ids);
        await inserirLinhas(lote);
        confirmarEnvio(ids);
        enviadas += lote.length;
    }
    if (enviadas) console.info(`[FocoPro] ${enviadas} resposta(s) pendente(s) enviadas para a nuvem.`);
}

/**
 * Reenvia as respostas que ficaram na fila. Só manda as do usuário logado agora.
 * Chamada ao abrir o app, ao fazer login, quando a sessão é renovada e quando o navegador
 * volta a ficar online.
 */
export async function enviarFilaPendente() {
    if (enviandoFila) return;
    if (lerFila().length === 0) return;

    enviandoFila = true;
    try {
        await comTravaEntreJanelas('focopro-fila-respostas', enviarFilaAgora);
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

async function enviarUpsertFavorito(linhaDaFila) {
    const { _lid, ...linha } = linhaDaFila; // _lid é controle da fila local: não vai para o banco
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

async function enviarFilaFavoritosAgora() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const user = session?.user;
    if (!user) return;

    // Lida depois de esperar a sessão; linhas de versões antigas ganham id local
    let fila = lerFilaFavoritos();
    if (fila.some(l => !l._lid)) {
        fila = fila.map(l => (l._lid ? l : { ...l, _lid: novoIdLocal() }));
        gravarFilaFavoritos(fila);
    }
    const minhas = fila.filter(l => l.user_id === user.id);
    if (minhas.length === 0) return;

    let enviadas = 0;
    for (const linha of minhas) {
        await enviarUpsertFavorito(linha);
        if (!tabelaFavoritosExiste) return; // tabela ainda não existe: tudo continua na fila
        // Sai da fila só a linha confirmada; o que entrou durante o envio continua lá
        gravarFilaFavoritos(lerFilaFavoritos().filter(l => l._lid !== linha._lid));
        enviadas += 1;
    }
    console.info(`[FocoPro] ${enviadas} favorito(s)/anotação(ões) pendente(s) enviados para a nuvem.`);
}

/**
 * Reenvia favoritos/anotações que ficaram pendentes (sem internet no momento, etc.).
 * Chamada ao carregar o histórico, quando a sessão é renovada e quando o navegador volta a ficar online.
 */
export async function enviarFilaFavoritosPendente() {
    if (enviandoFilaFavoritos || !tabelaFavoritosExiste) return;
    if (lerFilaFavoritos().length === 0) return;

    enviandoFilaFavoritos = true;
    try {
        await comTravaEntreJanelas('focopro-fila-favoritos', enviarFilaFavoritosAgora);
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
    const montar = (userId) => ({
        _lid: novoIdLocal(),
        user_id: userId,
        questao_id: String(questaoId),
        ...camposValor,
        [campoCarimbo]: new Date(momento).toISOString()
    });
    const guardarNaFila = (linha) => gravarFilaFavoritos([...lerFilaFavoritos(), linha]);

    // A02: sem internet, vai direto para a fila com o usuário guardado no aparelho (como as
    // respostas). Antes, offline com o login vencido a sessão vinha vazia e a mudança era
    // descartada: ficava só neste aparelho para sempre.
    if (usuarioOfflineId && typeof navigator !== 'undefined' && navigator.onLine === false) {
        guardarNaFila(montar(usuarioOfflineId));
        return;
    }
    let user = null;
    try {
        const { data: { session } } = await Promise.race([
            supabaseClient.auth.getSession(),
            new Promise((_, rejeita) => setTimeout(() => rejeita(new Error('sessão demorou')), 4000))
        ]);
        user = session?.user || null;
    } catch (e) { /* segue sem usuário */ }
    if (!user && usuarioOfflineId) {
        guardarNaFila(montar(usuarioOfflineId)); // sobe quando a sessão for renovada
        return;
    }
    if (!user) return; // visitante: fica só no aparelho

    const linha = montar(user.id);
    try {
        await enviarUpsertFavorito(linha);
    } catch (erro) {
        console.warn("[FocoPro] Sem conexão para salvar na nuvem agora; tentando de novo mais tarde:", erro.message);
        guardarNaFila(linha);
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
        // Sem a coluna 'concursos', gravar sem ela jogaria questões de outro concurso no banco de TI.
        if (/\bconcursos\b/i.test(`${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`)) {
            throw new Error("O banco ainda não tem a coluna 'concursos'. Rode a SQL docs/sql/concurso-trilhas.sql no Supabase antes de importar questões com concurso.");
        }
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
                // Concurso (trilha): só vai quando a questão diz a quais concursos serve.
                // Sem isso, a coluna fica vazia e a questão conta como TI.
                if (Array.isArray(qNorm.concursos) && qNorm.concursos.length) linha.concursos = qNorm.concursos;
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
        if (gabaritosOffline && typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('sem internet');
        const chamada = supabaseClient.rpc('verificar_resposta', {
            p_questao_id: String(questao.id),
            p_resposta: String(respostaEscolhida)
        });
        // Com pacote offline, não espera a internet: 5 s sem resposta e corrige com o gabarito baixado
        const { data, error } = gabaritosOffline
            ? await Promise.race([chamada, new Promise((_, rejeita) => setTimeout(() => rejeita(new Error('sem resposta do servidor')), 5000))])
            : await chamada;
        if (error) throw error;
        const linha = Array.isArray(data) ? data[0] : data;
        if (linha && linha.gabarito) {
            return { acertou: Boolean(linha.acertou), gabarito: String(linha.gabarito).toUpperCase() };
        }
        motivo = 'nao-encontrada'; // função existe, mas essa questão não está em questoes_gabarito
    } catch (erro) {
        const bruto = gabaritosOffline && gabaritosOffline[String(questao.id)];
        if (!erroDeRpcInexistente(erro) && bruto) {
            // Sem internet, mas com o pacote baixado: corrige com o gabarito do aparelho
            const gabarito = gabaritoDe({ ...questao, gabarito: bruto, resposta_correta: bruto });
            return { acertou: String(respostaEscolhida).trim().toUpperCase() === gabarito, gabarito };
        }
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


// ---------- Explicação do erro com IA (Caderno de erros) ----------
// A função de servidor lê a questão e o gabarito do banco; o navegador manda só o id e a letra
// que errou. Devolve { ok, explicacao, deCache, usoHoje, limiteDia } ou { ok:false, code, message }.
export async function pedirExplicacaoIA(questaoId, respostaUsuario) {
    try {
        const { data, error } = await supabaseClient.functions.invoke('super-function', {
            body: { questaoId, respostaUsuario }
        });
        if (error) {
            let corpo = null;
            try { corpo = await error.context.json(); } catch (e) { /* sem corpo legível */ }
            return { ok: false, code: (corpo && corpo.code) || 'rede', message: (corpo && corpo.message) || 'Sem conexão com a IA agora.' };
        }
        return data && typeof data === 'object' ? data : { ok: false, code: 'resposta', message: 'A IA não respondeu direito. Tente de novo.' };
    } catch (e) {
        return { ok: false, code: 'rede', message: 'Sem conexão com a IA agora.' };
    }
}

// ---------- Fila do dia na nuvem (uma só por conta, igual no celular e no computador) ----------
// Quem abre primeiro no dia grava; os outros aparelhos usam a mesma. Falha de rede = null.
export async function lerFilaDoDiaNuvem(dia) {
    try {
        const { data, error } = await supabaseClient.from('fila_do_dia').select('ids, venciam').eq('dia', dia).maybeSingle();
        if (error || !data || !Array.isArray(data.ids)) return null;
        return { dia, ids: data.ids.map(String), venciam: Number(data.venciam) || 0 };
    } catch (e) { return null; }
}

export async function gravarFilaDoDiaNuvem(fila) {
    try {
        const { error } = await supabaseClient.from('fila_do_dia')
            .upsert({ dia: fila.dia, ids: fila.ids, venciam: fila.venciam || 0 }, { onConflict: 'user_id,dia', ignoreDuplicates: true });
        return !error;
    } catch (e) { return false; }
}

// ---------- Perfil na nuvem (concurso, meta, dias e horas: igual em todos os aparelhos) ----------
export async function lerPerfilNuvem() {
    try {
        const { data, error } = await supabaseClient.from('perfis').select('perfil, atualizado_em').maybeSingle();
        if (error || !data || !data.perfil) return null;
        return { perfil: data.perfil, atualizadoEm: Date.parse(data.atualizado_em) || 0 };
    } catch (e) { return null; }
}

export async function gravarPerfilNuvem(perfil, atualizadoEm) {
    try {
        const { error } = await supabaseClient.from('perfis')
            .upsert({ perfil, atualizado_em: new Date(atualizadoEm).toISOString() }, { onConflict: 'user_id' });
        return !error;
    } catch (e) { return false; }
}

// ---------- Histórico de simulados (nuvem) ----------
// reg: { id, em (ISO), total, acertos, brancos, segundos, porTempo, concurso, porMateria }
export async function salvarSimuladoNuvem(reg) {
    try {
        const { error } = await supabaseClient.from('simulados').upsert({
            id: reg.id, criado_em: reg.em, total: reg.total, acertos: reg.acertos, brancos: reg.brancos || 0,
            segundos: reg.segundos || 0, por_tempo: Boolean(reg.porTempo), concurso: reg.concurso || null,
            por_materia: reg.porMateria || {}
        }, { onConflict: 'id', ignoreDuplicates: true });
        return !error;
    } catch (e) { return false; }
}

export async function listarSimuladosNuvem() {
    try {
        const { data, error } = await supabaseClient.from('simulados')
            .select('id, criado_em, total, acertos, brancos, segundos, por_tempo, concurso, por_materia')
            .order('criado_em', { ascending: false }).limit(100);
        if (error || !Array.isArray(data)) return null;
        return data.map(r => ({ id: r.id, em: r.criado_em, total: r.total, acertos: r.acertos, brancos: r.brancos || 0,
            segundos: r.segundos || 0, porTempo: r.por_tempo, concurso: r.concurso, porMateria: r.por_materia || {} }));
    } catch (e) { return null; }
}
