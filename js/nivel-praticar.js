// I1 (v200): quando o Praticar de um assunto pode subir do nível 1 (Iniciante) para o 2 (Intermediário).
// Regra decidida em 13/11 (claude/01-metodo/decisoes-metodo-13-11.md, item 2):
//   85% de acerto COM "tenho certeza", em pelo menos 6 questões diferentes respondidas,
//   com acertos com certeza em pelo menos 2 dias diferentes.
// Conta a última resposta de cada questão (sem contar repetidas). Resposta antiga sem a
// pergunta de certeza conta como certeza (mesma convenção do resto do app).
// Assunto com menos de 6 questões de nível 1: exige todas respondidas (senão nunca subiria).
import { diaLocal } from './storage.js';

export const REGRA_SUBIDA = { minimo: 0.85, questoes: 6, dias: 2 };

export function situacaoDaSubida(questoesN1, historico) {
    const respondidas = questoesN1
        .map(q => historico[String(q.id)])
        .filter(h => h && h.tentativas);
    const fortes = respondidas.filter(h => h.ultimaResposta === 'certo' && h.ultimaConfianca !== 'duvida');
    const dias = new Set(fortes.map(h => (h.ultimaData ? diaLocal(h.ultimaData) : h.ultimoDiaAcerto)).filter(Boolean));
    const taxa = respondidas.length ? fortes.length / respondidas.length : 0;
    const minimo = Math.min(REGRA_SUBIDA.questoes, questoesN1.length);
    const pronto = respondidas.length >= minimo && respondidas.length > 0
        && taxa >= REGRA_SUBIDA.minimo
        && dias.size >= REGRA_SUBIDA.dias;
    return {
        pronto,
        respondidas: respondidas.length,
        comCerteza: fortes.length,
        taxa,
        dias: dias.size,
        naoRespondidas: questoesN1.length - respondidas.length
    };
}
