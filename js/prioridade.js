// ============================================================
// js/prioridade.js - Prioridade da recuperação (FocoPro)
// ============================================================
// Decidido com o Nathan em 08/11/2026 (versão 1, para teste na semana de embarque). Dia de recuperação:
// em vez de "as mais antigas" ou "quem tem mais erros no total", lista os assuntos onde o erro pesa mais.
//   - taxa de erro = questões ainda erradas ÷ questões respondidas do assunto (respeita o volume: assunto com
//     poucas respostas não entra, para um erro isolado não virar "dificuldade");
//   - erro COM CERTEZA pesa mais (falsa segurança): soma 0,5 × a parcela de erros com certeza.
// Sem peso do edital nesta versão. Regras puras, sem tela e sem mexer na agenda de revisão.

export const MIN_RESPONDIDAS = 4;
export const TOPO = 3;

export function prioridadesDeRecuperacao(questoes, historico, { minimo = MIN_RESPONDIDAS, topo = TOPO } = {}) {
    const grupos = new Map();
    (questoes || []).forEach((q) => {
        const h = historico && historico[String(q.id)];
        if (!h || !(h.tentativas > 0)) return;
        const k = `${q.materia || 'Geral'}|${q.assunto || 'Geral'}`;
        if (!grupos.has(k)) grupos.set(k, { materia: q.materia || 'Geral', assunto: q.assunto || 'Geral', respondidas: 0, erradas: 0, comCerteza: 0 });
        const g = grupos.get(k);
        g.respondidas += 1;
        if (h.status === 'erro') {
            g.erradas += 1;
            if (h.erroComCerteza) g.comCerteza += 1;
        }
    });
    return [...grupos.values()]
        .filter((g) => g.respondidas >= minimo && g.erradas > 0)
        .map((g) => ({ ...g, taxa: Math.round((g.erradas * 100) / g.respondidas), pontos: (g.erradas + 0.5 * g.comCerteza) / g.respondidas }))
        .sort((a, b) => b.pontos - a.pontos || b.erradas - a.erradas || a.assunto.localeCompare(b.assunto))
        .slice(0, topo);
}
