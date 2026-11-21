// ============================================================
// js/bloco.js - Bloco do dia: estado, passos do dia e retestes (FocoPro)
// ============================================================
// Decidido em 21/11/2026 (Nathan, coordenação e Central): o app acompanha o "bloco do dia".
//   - Bloco = um ASSUNTO (o grupo do edital é a trilha que ordena os assuntos).
//   - 1 bloco novo por dia; o segundo só se for revisão.
//   - Sequência: escolher o bloco → caderno de erros do bloco (teto de 5 erros) → rever
//     (cartão ou vídeo) → questões novas do assunto → fechamento.
//   - Retestes (assunto + data) entram no "Revisar hoje": uma lista só.
// Este arquivo não mexe na tela nem na nuvem: só regras puras e o que fica no aparelho.

export const CHAVE_BLOCO = 'appEstudos_BlocoAtivo';
export const CHAVE_PASSOS = 'appEstudos_BlocoPassos';
export const CHAVE_RETESTES = 'appEstudos_Retestes';
// Os retestes são da conta: a chave leva o id do usuário (duas pessoas no mesmo aparelho não se misturam).
let sufixoUsuario = '';
export function usarUsuarioRetestes(id) { sufixoUsuario = id ? `_${id}` : ''; }
export const TETO_ERROS_BLOCO = 5;

// Passo 1 (escolher o bloco) é o próprio bloco ativo; os demais o aluno marca (ou o app marca sozinho).
export const PASSOS = [
    { id: 'erros', titulo: 'Caderno de erros do bloco', ajuda: `Sugestão: até ${TETO_ERROS_BLOCO} erros, cerca de 10 min. Diga por que errou antes de ver a resposta.` },
    { id: 'rever', titulo: 'Rever o assunto', ajuda: 'Cartão do Aprender ou vídeo.' },
    { id: 'questoes', titulo: 'Questões novas', ajuda: 'Do mesmo assunto, que você ainda não respondeu.' },
    { id: 'fechamento', titulo: 'Fechamento', ajuda: 'Anote em uma linha o que travou (5 min).' }
];

function lerJSON(chave, padrao) {
    try {
        const v = JSON.parse(localStorage.getItem(chave) || 'null');
        return v === null || v === undefined ? padrao : v;
    } catch (e) { return padrao; }
}
function gravarJSON(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* sem espaço: segue sem guardar */ }
}

// ---------- Datas (calendário local, formato AAAA-MM-DD) ----------
export function diaDeHoje(agora = Date.now()) {
    const d = new Date(agora);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function somarDiasData(dia, n) {
    const [a, m, d] = dia.split('-').map(Number);
    const x = new Date(a, m - 1, d + n);
    const p = (k) => String(k).padStart(2, '0');
    return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}
export const dataValida = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !Number.isNaN(Date.parse(`${s}T00:00:00`));
export function formatarDiaBR(dia) {
    if (!dataValida(dia)) return '';
    const [a, m, d] = dia.split('-');
    return `${d}/${m}`;
}

// ---------- Bloco ativo ----------
export function lerBloco() {
    const b = lerJSON(CHAVE_BLOCO, null);
    return b && typeof b.materia === 'string' && typeof b.assunto === 'string' && b.assunto
        ? { materia: b.materia, assunto: b.assunto, dia: b.dia || null, suspenso: Boolean(b.suspenso) } : null;
}
export function gravarBloco(materia, assunto, hoje = diaDeHoje()) {
    gravarJSON(CHAVE_BLOCO, { materia, assunto, dia: hoje, suspenso: false });
}
// "Ver tudo" só SUSPENDE o filtro: o bloco continua guardado e dá para voltar a ele (Sala Design, 21/11/2026).
export function suspenderBloco() {
    const b = lerBloco();
    if (b) gravarJSON(CHAVE_BLOCO, { ...b, suspenso: true });
}
export function limparBloco() {
    try { localStorage.removeItem(CHAVE_BLOCO); } catch (e) { /* nada */ }
}
export const mesmoBloco = (a, b) => Boolean(a && b && a.materia === b.materia && a.assunto === b.assunto);

// ---------- Passos do dia (valem para o bloco e o dia em que foram marcados) ----------
export function lerPassos(bloco, hoje = diaDeHoje()) {
    const r = lerJSON(CHAVE_PASSOS, null);
    if (!r || r.dia !== hoje || !mesmoBloco(r.bloco, bloco) || !Array.isArray(r.feitos)) return new Set();
    return new Set(r.feitos.filter((id) => PASSOS.some((p) => p.id === id)));
}
export function alternarPasso(bloco, id, hoje = diaDeHoje()) {
    if (!bloco || !PASSOS.some((p) => p.id === id)) return new Set();
    const feitos = lerPassos(bloco, hoje);
    if (feitos.has(id)) feitos.delete(id); else feitos.add(id);
    gravarJSON(CHAVE_PASSOS, { dia: hoje, bloco: { materia: bloco.materia, assunto: bloco.assunto }, feitos: [...feitos] });
    return feitos;
}
export function marcarPasso(bloco, id, hoje = diaDeHoje()) {
    if (!bloco || !PASSOS.some((p) => p.id === id)) return;
    const feitos = lerPassos(bloco, hoje);
    if (feitos.has(id)) return;
    feitos.add(id);
    gravarJSON(CHAVE_PASSOS, { dia: hoje, bloco: { materia: bloco.materia, assunto: bloco.assunto }, feitos: [...feitos] });
}

// ---------- O que o bloco tem hoje (lê histórico e questões; não muda nada) ----------
const doBloco = (q, b) => q && b && q.materia === b.materia && q.assunto === b.assunto;

// Erros em aberto do bloco (a última resposta foi errada). Erro com certeza primeiro, depois o mais recente.
export function errosDoBloco(questoes, historico, bloco) {
    return (questoes || [])
        .filter((q) => doBloco(q, bloco))
        .map((q) => ({ q, h: (historico || {})[String(q.id)] }))
        .filter(({ h }) => h && h.ultimaResposta === 'errado')
        .sort((a, b) => {
            const ca = a.h.erroComCerteza ? 0 : 1, cb = b.h.erroComCerteza ? 0 : 1;
            if (ca !== cb) return ca - cb;
            return (b.h.ultimaData || 0) - (a.h.ultimaData || 0);
        })
        .map(({ q }) => q);
}

export function novasDoBloco(questoes, historico, bloco) {
    return (questoes || []).filter((q) => doBloco(q, bloco) && !((historico || {})[String(q.id)] || {}).tentativas);
}

export function resumoDoBloco(questoes, historico, bloco) {
    const todas = (questoes || []).filter((q) => doBloco(q, bloco));
    const erros = errosDoBloco(questoes, historico, bloco);
    const novas = novasDoBloco(questoes, historico, bloco);
    return { total: todas.length, erros: erros.length, errosNoTeto: Math.min(erros.length, TETO_ERROS_BLOCO), novas: novas.length };
}

// ---------- Retestes ----------
// Um reteste é um assunto com data marcada pela coordenação (ex.: "Normalização: reteste em 22/11").
// Formato: { id, materia, assunto, data: 'AAAA-MM-DD', feito, feitoEm, nota, pendente }
// "pendente" = ainda não subiu para a nuvem (feito no aparelho sem sinal).
export function novoId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'r-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function normalizarReteste(r) {
    if (!r || !r.assunto || !dataValida(r.data)) return null;
    return {
        id: String(r.id || novoId()),
        materia: String(r.materia || ''),
        assunto: String(r.assunto),
        data: String(r.data),
        feito: Boolean(r.feito),
        feitoEm: r.feitoEm || null,
        nota: String(r.nota || ''),
        pendente: Boolean(r.pendente)
    };
}

export function criarReteste(materia, assunto, data, nota = '') {
    return normalizarReteste({ id: novoId(), materia, assunto, data, nota, feito: false, pendente: true });
}

export function lerRetestesLocal() {
    const v = lerJSON(CHAVE_RETESTES + sufixoUsuario, []);
    return Array.isArray(v) ? v.map(normalizarReteste).filter(Boolean) : [];
}
export function gravarRetestesLocal(lista) {
    gravarJSON(CHAVE_RETESTES + sufixoUsuario, (lista || []).map(normalizarReteste).filter(Boolean));
}

// Junta o que está no aparelho com o que veio da nuvem. O que está pendente no aparelho vale
// (foi feito sem sinal); fora isso a nuvem manda. Reteste só no aparelho e já sincronizado
// (sumiu da nuvem) foi apagado em outro aparelho: sai.
export function mesclarRetestes(local, nuvem) {
    const porId = new Map();
    (nuvem || []).map(normalizarReteste).filter(Boolean).forEach((r) => porId.set(r.id, r));
    (local || []).map(normalizarReteste).filter(Boolean).forEach((r) => {
        if (r.pendente) porId.set(r.id, r);
    });
    return [...porId.values()].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.assunto.localeCompare(b.assunto)));
}

// Para o "Revisar hoje": atrasados (data anterior a hoje), de hoje e os próximos (até 7 dias). Só os não feitos.
export function retestesDoDia(lista, hoje = diaDeHoje()) {
    const abertos = (lista || []).map(normalizarReteste).filter((r) => r && !r.feito)
        .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.assunto.localeCompare(b.assunto)));
    const limite = somarDiasData(hoje, 7);
    return {
        atrasados: abertos.filter((r) => r.data < hoje),
        hoje: abertos.filter((r) => r.data === hoje),
        proximos: abertos.filter((r) => r.data > hoje && r.data <= limite)
    };
}
export function totalRetestesVencidos(lista, hoje = diaDeHoje()) {
    const d = retestesDoDia(lista, hoje);
    return d.atrasados.length + d.hoje.length;
}


// ---------- Diagnóstico de erro (Fase 2): o aluno diz POR QUE errou antes de ver a explicação ----------
// Tipo é obrigatório (ou "Ainda não sei"); o texto é opcional. Fica no aparelho, por conta.
export const CHAVE_DIAGNOSTICOS = 'appEstudos_DiagnosticoErros';
export const TIPOS_ERRO = [
    { id: 'conceito', nome: 'Conceito', ajuda: 'Eu não sabia a regra' },
    { id: 'confusao', nome: 'Confusão', ajuda: 'Misturei dois conceitos' },
    { id: 'interpretacao', nome: 'Interpretação', ajuda: 'Entendi o enunciado errado' },
    { id: 'desatencao', nome: 'Desatenção', ajuda: 'Sabia, mas deixei passar um detalhe' },
    { id: 'aplicacao', nome: 'Aplicação', ajuda: 'Sabia a teoria, mas não consegui usar' },
    { id: 'nao_sei', nome: 'Ainda não sei', ajuda: 'Depois da explicação eu classifico' }
];
export const TEMPO_ORIENTATIVO_MIN = 10;
export function lerDiagnosticos() {
    const v = lerJSON(CHAVE_DIAGNOSTICOS + sufixoUsuario, {});
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}
export function gravarDiagnostico(questaoId, tipo, texto = '', agora = Date.now()) {
    if (!TIPOS_ERRO.some((t) => t.id === tipo)) return null;
    const todos = lerDiagnosticos();
    const d = { tipo, texto: String(texto || '').trim().slice(0, 300), em: agora, dia: diaDeHoje(agora) };
    todos[String(questaoId)] = d;
    gravarJSON(CHAVE_DIAGNOSTICOS + sufixoUsuario, todos);
    return d;
}
// Quantos erros foram diagnosticados hoje (para a sugestão de avançar, que é só orientativa)
export function diagnosticadosHoje(hoje = diaDeHoje()) {
    return Object.values(lerDiagnosticos()).filter((d) => d && d.dia === hoje).length;
}
export function apagarDiagnostico(questaoId) {
    const todos = lerDiagnosticos();
    delete todos[String(questaoId)];
    gravarJSON(CHAVE_DIAGNOSTICOS + sufixoUsuario, todos);
}
