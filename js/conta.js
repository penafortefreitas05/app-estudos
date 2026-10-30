// ============================================================
// js/conta.js - Nível de conta (FocoPro)
// ============================================================
// Pontos por DOMÍNIO, não por volume. Uma questão vale pontos quando o histórico dela diz que
// você a acertou COM CERTEZA (status acerto, superado ou dominada). Acerto na dúvida e erro não
// valem nada, e errar de novo uma questão tira os pontos dela. Bônus de +1 quando a questão
// já foi errada e foi superada na revisão. O nível já conquistado nunca desce.
// Tudo é derivado do histórico: não há tabela nova.

const PONTOS_POR_NIVEL = { 1: 1, 2: 2, 3: 3, 4: 4 };
const STATUS_QUE_PONTUAM = new Set(['acerto', 'superado', 'dominada']);
const CHAVE_NIVEL_CONQUISTADO = 'appEstudos_NivelConta';

export const NIVEIS_CONTA = [
    { nome: 'Aspirante', minimo: 0 },
    { nome: 'Candidato', minimo: 200 },
    { nome: 'Concurseiro', minimo: 500 },
    { nome: 'Analista', minimo: 900 },
    { nome: 'Especialista', minimo: 1400 },
    { nome: 'Aprovado', minimo: 1900 }
];

export function calcularPontos(questoes, historico) {
    let pontos = 0;
    let dominadas = 0;
    (questoes || []).forEach(q => {
        const h = historico && historico[String(q.id)];
        if (!h || !STATUS_QUE_PONTUAM.has(h.status)) return;
        const base = PONTOS_POR_NIVEL[Number(q.nivel)] || 1;
        const bonus = (h.erros || 0) > 0 && (h.status === 'superado' || h.status === 'dominada') ? 1 : 0;
        pontos += base + bonus;
        dominadas += 1;
    });
    return { pontos, dominadas };
}

export function nivelPorPontos(pontos) {
    let indice = 0;
    NIVEIS_CONTA.forEach((n, i) => { if (pontos >= n.minimo) indice = i; });
    return indice;
}

function lerConquistado() {
    try {
        const v = Number(localStorage.getItem(CHAVE_NIVEL_CONQUISTADO));
        return Number.isInteger(v) && v >= 0 && v < NIVEIS_CONTA.length ? v : 0;
    } catch (e) { return 0; }
}
function gravarConquistado(i) {
    try { localStorage.setItem(CHAVE_NIVEL_CONQUISTADO, String(i)); } catch (e) { /* sem localStorage */ }
}

/** Situação completa da conta: nível exibido (nunca desce), progresso até o próximo. */
export function situacaoDaConta(questoes, historico) {
    const { pontos, dominadas } = calcularPontos(questoes, historico);
    const porPontos = nivelPorPontos(pontos);
    const conquistado = Math.max(lerConquistado(), porPontos);
    if (conquistado > lerConquistado()) gravarConquistado(conquistado);
    const proximo = NIVEIS_CONTA[conquistado + 1] || null;
    const base = NIVEIS_CONTA[conquistado].minimo;
    const emQueda = porPontos < conquistado; // errou questões dominadas: o nível fica, mas para de avançar
    const pct = proximo ? Math.max(0, Math.min(100, Math.round((pontos - base) * 100 / (proximo.minimo - base)))) : 100;
    return { pontos, dominadas, indice: conquistado, nome: NIVEIS_CONTA[conquistado].nome, proximo, falta: proximo ? Math.max(0, proximo.minimo - pontos) : 0, pct, emQueda, faltaParaManter: emQueda ? NIVEIS_CONTA[conquistado].minimo - pontos : 0 };
}

function esc(t) { return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

let ultima = null;

/** Atualiza o selo na barra lateral. Chamado sempre que o painel é redesenhado. */
export function atualizarNivelConta(questoes, historico) {
    const botoes = document.querySelectorAll('.js-nivel-abrir');
    if (!botoes.length) return;
    const s = situacaoDaConta(questoes, historico);
    ultima = s;
    const longo = s.proximo
        ? `${s.pontos} pontos · faltam <b>${s.falta}</b> para ${esc(s.proximo.nome)}`
        : `${s.pontos} pontos · nível máximo`;
    const curto = s.proximo ? `${s.pontos} de ${s.proximo.minimo} pontos` : `${s.pontos} pontos · máximo`;
    botoes.forEach(b => {
        b.hidden = false;
        b.querySelector('.js-nivel-nome').textContent = `Nível ${s.indice + 1} · ${s.nome}`;
        b.querySelector('.js-nivel-barra').style.width = `${s.pct}%`;
        const longoEl = b.querySelector('.js-nivel-texto'); if (longoEl) longoEl.innerHTML = longo;
        const curtoEl = b.querySelector('.js-nivel-curto'); if (curtoEl) curtoEl.textContent = curto;
    });
}

/** Conteúdo da tela de detalhes (regra e escada). */
export function renderizarDetalhesDaConta(raiz) {
    const s = ultima;
    if (!s) { raiz.innerHTML = '<p class="modal-mensagem">Responda algumas questões para começar a pontuar.</p>'; return; }
    const escada = NIVEIS_CONTA.map((n, i) => `<div class="conta-degrau${i === s.indice ? ' atual' : ''}${i < s.indice ? ' feito' : ''}"><span>Nível ${i + 1} · ${esc(n.nome)}${i === s.indice ? ' ← você está aqui' : ''}</span><span>${n.minimo}</span></div>`).join('');
    raiz.innerHTML = `
        <p class="conta-resumo"><strong>${s.pontos}</strong> pontos · <strong>${s.dominadas}</strong> questões dominadas</p>
        ${s.emQueda ? `<p class="conta-aviso">Você errou questões que já estavam dominadas. O seu nível fica, mas só volta a avançar quando recuperar ${s.faltaParaManter} pontos.</p>` : ''}
        <h4 class="dia-subtitulo">Como se ganha ponto</h4>
        <ul class="conta-regras">
            <li>A questão só pontua quando você a acerta <b>com "Tenho certeza"</b>, ou quando a supera na revisão.</li>
            <li>Vale <b>1</b> ponto no Iniciante, <b>2</b> no Intermediário, <b>3</b> no Avançado e <b>4</b> no Especialista.</li>
            <li><b>+1</b> quando você errou a questão antes e a superou na revisão.</li>
            <li>Acerto na dúvida não conta. Errar de novo uma questão dominada tira os pontos dela. O nível que você já conquistou nunca desce.</li>
        </ul>
        <h4 class="dia-subtitulo">Níveis</h4>
        <div class="conta-escada">${escada}</div>`;
}
