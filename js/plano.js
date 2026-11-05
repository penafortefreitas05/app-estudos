// ============================================================
// js/plano.js - Plano de estudo da semana (FocoPro) - versão 1
// ============================================================
// Decidido com o Nathan em 05/11/2026. O plano sai de 4 coisas: os dias da semana que a pessoa
// marcou, as horas por dia, os assuntos do concurso escolhido (já filtrados) e o que ela já
// aprendeu. Tudo local: funciona sem internet. Regras puras, sem tela.
//
// Versão 1, sem adaptação: as matérias seguem a ordem de prioridade do app e a pessoa avança
// por elas até terminar os assuntos. Depois o plano passa a reforçar o que ela mais erra.

export const MIN_POR_ASSUNTO = 25;   // ler os cartões + um exemplo
export const MIN_POR_QUESTAO = 2.5;  // inclui conferir o gabarito
export const NOMES_DIA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Quantos assuntos novos cabem num dia com essas horas
export const assuntosPorDia = (horas) => (horas <= 1 ? 1 : horas <= 2 ? 2 : 3);

// Questões do dia: o tempo que sobra depois dos assuntos novos. A revisão do dia entra nessa conta.
export function questoesSugeridas(horas, nAssuntos) {
    return Math.max(5, Math.round((horas * 60 - nAssuntos * MIN_POR_ASSUNTO) / MIN_POR_QUESTAO));
}

// Segunda-feira da semana de `hoje`
function segundaDaSemana(hoje) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const atras = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - atras);
    return d;
}

/**
 * grupos: [{ materia, assuntos: [{ materia, assunto }] }] já na ordem de prioridade
 * aprendidos: { "materia|assunto": { data: "AAAA-MM-DD" } }
 * Devolve null se o perfil não tem dias e horas; senão
 * { horas, dias: [{ dia, nome, hoje, passou, blocos: [{ materia, assuntos: [{ assunto, feito }] }], questoes }], hojeEhDia, proximo }
 */
export function montarPlano({ perfil, grupos, aprendidos = {}, hoje = new Date() }) {
    const diasEscolhidos = Array.isArray(perfil && perfil.dias) ? perfil.dias.filter((n) => n >= 0 && n <= 6) : [];
    const horas = Number(perfil && perfil.horas) || 0;
    if (!diasEscolhidos.length || !horas) return null;

    const segunda = segundaDaSemana(hoje);
    const inicioSemana = iso(segunda);
    const hojeIso = iso(hoje);

    // Assunto conta como "do plano desta semana" se está pendente ou foi aprendido nesta semana:
    // assim o plano não muda de lugar enquanto a pessoa cumpre o que ele pediu.
    const feitoNaSemana = (m, a) => { const v = aprendidos[`${m}|${a}`]; return Boolean(v) && String(v.data || '') >= inicioSemana; };
    const pendenteOuDaSemana = (m, a) => !aprendidos[`${m}|${a}`] || feitoNaSemana(m, a);

    const sequencia = grupos
        .map((g) => ({ materia: g.materia, assuntos: g.assuntos.filter((a) => pendenteOuDaSemana(a.materia, a.assunto)) }))
        .filter((g) => g.assuntos.length);

    const nAssuntos = assuntosPorDia(horas);
    const nMaterias = horas >= 3 ? 2 : 1;
    const usados = new Set();
    let cursor = 0;

    // Segunda a domingo, só nos dias marcados (domingo = 0 vai por último)
    const ordemSemana = [1, 2, 3, 4, 5, 6, 0].filter((n) => diasEscolhidos.includes(n));
    const dias = ordemSemana.map((n) => {
        const data = new Date(segunda);
        data.setDate(segunda.getDate() + ((n + 6) % 7));
        const blocos = [];
        let restantes = nAssuntos;
        for (let m = 0; m < nMaterias && sequencia.length; m++) {
            const g = sequencia[(cursor + m) % sequencia.length];
            const quota = m === nMaterias - 1 ? restantes : Math.ceil(restantes / (nMaterias - m));
            const escolhidos = g.assuntos.filter((a) => !usados.has(`${a.materia}|${a.assunto}`)).slice(0, quota);
            escolhidos.forEach((a) => usados.add(`${a.materia}|${a.assunto}`));
            restantes -= escolhidos.length;
            if (escolhidos.length) {
                blocos.push({
                    materia: g.materia,
                    assuntos: escolhidos.map((a) => ({ assunto: a.assunto, feito: Boolean(aprendidos[`${a.materia}|${a.assunto}`]) }))
                });
            }
        }
        cursor += nMaterias;
        const total = blocos.reduce((s, b) => s + b.assuntos.length, 0);
        const dataIso = iso(data);
        return { dia: n, nome: NOMES_DIA[n], data: dataIso, hoje: dataIso === hojeIso, passou: dataIso < hojeIso, blocos, questoes: questoesSugeridas(horas, total) };
    });

    const hojeEhDia = dias.some((d) => d.hoje);
    const proximo = dias.find((d) => d.data > hojeIso) || null;
    return { horas, dias, hojeEhDia, proximo };
}
