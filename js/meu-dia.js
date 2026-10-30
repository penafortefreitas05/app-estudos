// ============================================================
// js/meu-dia.js - Tela "Meu dia": acertos de hoje e dos últimos 7 dias (FocoPro)
// ============================================================
import { diaLocal } from './storage.js';

const NOMES_DIA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function vazio() { return { n: 0, ac: 0 }; }

/**
 * Soma as respostas por dia. "Nova" = primeira resposta daquela questão na vida;
 * "revisão" = a questão já tinha resposta antes (no período ou antes dele).
 * linhas: [{questao_id, acertou, created_at}] em ordem de data. jaVistas: Set de ids.
 */
export function resumirPorDia(linhas, jaVistas, dias = 7, agora = Date.now()) {
    const lista = [];
    for (let i = dias - 1; i >= 0; i--) {
        const d = new Date(agora);
        d.setDate(d.getDate() - i);
        lista.push({ dia: diaLocal(d.getTime()), data: d, nova: vazio(), revisao: vazio() });
    }
    const porDia = new Map(lista.map(x => [x.dia, x]));
    const vistas = new Set(jaVistas || []);
    [...linhas]
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .forEach(l => {
            const id = String(l.questao_id);
            const dia = porDia.get(diaLocal(new Date(l.created_at).getTime()));
            const ehNova = !vistas.has(id);
            vistas.add(id);
            if (!dia) return;
            const alvo = ehNova ? dia.nova : dia.revisao;
            alvo.n += 1;
            if (l.acertou) alvo.ac += 1;
        });
    return lista;
}

function pct(b) { return b.n ? Math.round(b.ac * 100 / b.n) : null; }
function classePct(p) { return p == null ? '' : (p >= 70 ? 'alta' : (p >= 50 ? 'media' : 'baixa')); }

function linhaGrupo(rotulo, b) {
    const p = pct(b);
    const detalhe = b.n
        ? `<strong>${b.ac}</strong> de <strong>${b.n}</strong> certas · ${b.n - b.ac} erradas`
        : 'nenhuma ainda';
    return `<div class="dia-linha">
        <span class="dia-rotulo">${rotulo}</span>
        <span class="dia-detalhe">${detalhe}</span>
        <span class="dia-pct ${classePct(p)}">${p == null ? '—' : p + '%'}</span>
    </div>`;
}

export function renderizarMeuDia(raiz, dias) {
    const hoje = dias[dias.length - 1];
    const total = { n: hoje.nova.n + hoje.revisao.n, ac: hoje.nova.ac + hoje.revisao.ac };
    let html = `<div class="dia-hoje">
        ${linhaGrupo('🔁 Revisão', hoje.revisao)}
        ${linhaGrupo('✨ Questões novas', hoje.nova)}
        <div class="dia-total">${linhaGrupo('Total de hoje', total)}</div>
    </div>
    <h4 class="dia-subtitulo">Últimos 7 dias</h4>
    <div class="dia-semana">`;
    dias.forEach((d, i) => {
        const t = { n: d.nova.n + d.revisao.n, ac: d.nova.ac + d.revisao.ac };
        const p = pct(t);
        const rot = i === dias.length - 1 ? 'hoje' : NOMES_DIA[d.data.getDay()];
        html += `<div class="dia-col" title="${t.n ? `${t.ac} de ${t.n} certas (${d.revisao.n} revisão, ${d.nova.n} novas)` : 'sem questões'}">
            <span class="dia-barra-caixa"><span class="dia-barra ${classePct(p)}" style="height:${p == null ? 0 : Math.max(p, 4)}%"></span></span>
            <span class="dia-col-pct">${p == null ? '—' : p + '%'}</span>
            <span class="dia-col-n">${t.n}</span>
            <span class="dia-col-rot">${rot}</span>
        </div>`;
    });
    html += `</div><p class="dia-nota">Revisão = questão que você já tinha respondido antes. Nova = a primeira vez que você a responde. O número sob cada barra é o total de questões do dia.</p>`;
    raiz.innerHTML = html;
}
