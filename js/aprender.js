// ============================================================
// js/aprender.js - Trilha de aprendizagem por assunto (FocoPro)
// ============================================================
// "Aprender" (Fase 1, 28/10/2026): cada assunto do nível Iniciante é um cartão de dois lados.
//   Lado 1, Aprenda: a 1ª questão do assunto, já resolvida, com o comentário (exemplo resolvido).
//   Lado 2, Prove:   as outras questões Iniciante do mesmo assunto, uma por vez.
// Nada é guardado à parte: o estado de cada assunto sai do histórico que já existe.
// Este arquivo só tem regras (sem tela), para poder ser usado por ui.js e app.js sem import
// circular e testado sozinho.

// Ordem didática: as autorais são numeradas na ordem em que ensinam (focopro-bd-n1-001, 002...)
const compararIds = (a, b) => String(a.id).localeCompare(String(b.id), 'pt-BR', { numeric: true });

// Acertos (na última tentativa) que fazem o assunto contar como aprendido: 2 de cada 3
export const FRACAO_APRENDIDO = 2 / 3;

function respondeu(h) {
    return Boolean(h && Number(h.tentativas) > 0);
}

// Estado de um assunto a partir das questões de prova dele
export function estadoDoAssunto(assunto, historico) {
    const prova = assunto.prova;
    const respondidas = prova.filter(q => respondeu(historico[String(q.id)])).length;
    const certas = prova.filter(q => {
        const h = historico[String(q.id)];
        return respondeu(h) && h.ultimaResposta === 'certo';
    }).length;
    const minimo = Math.max(1, Math.ceil(prova.length * FRACAO_APRENDIDO));
    let estado = 'nao-visto';
    if (respondidas === prova.length && certas >= minimo) estado = 'aprendido';
    else if (respondidas > 0) estado = 'aprendendo';
    return { estado, respondidas, certas, total: prova.length, minimo };
}

// Trilha de uma matéria: os assuntos do Iniciante na ordem em que aparecem no banco.
// Com 2+ questões, a 1ª vira o exemplo resolvido e o resto, a prova. Com 1 só, ela é a prova.
export function montarTrilha(materia, questoes, historico = {}) {
    const iniciantes = questoes
        .filter(q => q.materia === materia && Number(q.nivel) === 1)
        .sort(compararIds);
    const porAssunto = new Map();
    iniciantes.forEach(q => {
        const nome = String(q.assunto || materia).trim() || materia;
        if (!porAssunto.has(nome)) porAssunto.set(nome, []);
        porAssunto.get(nome).push(q);
    });
    return [...porAssunto.entries()].map(([nome, qs]) => {
        const assunto = {
            nome,
            materia,
            exemplo: qs.length > 1 ? qs[0] : null,
            prova: qs.length > 1 ? qs.slice(1) : qs
        };
        return { ...assunto, ...estadoDoAssunto(assunto, historico) };
    });
}

// Resumo de todas as matérias que têm trilha: { materia: { total, aprendidos, proximo } }
export function resumoDasTrilhas(questoes, historico = {}) {
    const materias = [...new Set(questoes.filter(q => Number(q.nivel) === 1).map(q => q.materia))];
    const resumo = {};
    materias.forEach(m => {
        const trilha = montarTrilha(m, questoes, historico);
        resumo[m] = {
            total: trilha.length,
            aprendidos: trilha.filter(a => a.estado === 'aprendido').length,
            proximo: proximoAssunto(trilha)
        };
    });
    return resumo;
}

// Próximo a estudar: o primeiro que está "aprendendo" (continua de onde parou);
// senão, o primeiro ainda não visto; senão (tudo aprendido), null.
export function proximoAssunto(trilha) {
    return trilha.find(a => a.estado === 'aprendendo') || trilha.find(a => a.estado === 'nao-visto') || null;
}

// Ponte para a prova: uma questão de nível 2+ do mesmo assunto que a pessoa ainda não fez
export function questaoPonte(assunto, questoes, historico = {}) {
    return questoes
        .filter(q => q.materia === assunto.materia && Number(q.nivel) >= 2 &&
            String(q.assunto || '').trim() === assunto.nome && !respondeu(historico[String(q.id)]))
        .sort((a, b) => (Number(a.nivel) - Number(b.nivel)) || compararIds(a, b))[0] || null;
}
