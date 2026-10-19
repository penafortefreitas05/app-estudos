// ============================================================
// js/simulado.js - Gerenciamento de Cronômetro e Simulado
// ============================================================

import { esc, formatarTempo, gabaritoDe, revelar, atualizarPlacar } from './ui.js';
import { salvarHistorico } from './storage.js';

let intervaloCronometro;

export function iniciarCronometro(minutos, displayCronometro, callbackTempoEsgotado) {
    clearInterval(intervaloCronometro);
    const spanTempo = document.getElementById("tempo-restante");
    if (!spanTempo || !displayCronometro) return;

    displayCronometro.style.display = "block";
    spanTempo.style.color = "#ea580c";

    let restante = minutos * 60;

    function tick() {
        const min = Math.floor(restante / 60);
        const seg = restante % 60;
        spanTempo.innerText = `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;

        if (restante <= 0) {
            clearInterval(intervaloCronometro);
            spanTempo.innerText = "00:00 - TEMPO ESGOTADO!";
            spanTempo.style.color = "#ef4444";
            if (typeof callbackTempoEsgotado === 'function') callbackTempoEsgotado();
            return;
        }
        restante--;
    }

    tick();
    intervaloCronometro = setInterval(tick, 1000);
}

export function pararCronometro(displayCronometro) {
    clearInterval(intervaloCronometro);
    if (displayCronometro) displayCronometro.style.display = "none";
}

export function adicionarBotaoFinalizar(container) {
    container.insertAdjacentHTML("beforeend",
        `<div class="acoes-simulado"><button type="button" id="btn-finalizar" class="btn-primary">🏁 Finalizar simulado</button></div>`);
}

export function finalizarSimulado(simulado, container, porId, historico, questoes, porTempo = false) {
    if (!simulado || simulado.finalizado) return;
    simulado.finalizado = true;
    clearInterval(intervaloCronometro);

    let acertos = 0, erros = 0, brancos = 0;
    const porMateria = {};

    container.querySelectorAll(".questao-card").forEach(card => {
        const q = porId.get(card.dataset.id);
        if (!q) return;
        
        const resposta = simulado.respostas[q.id] ?? null;
        card.dataset.respondida = "1";
        
        if (resposta !== null) {
            const acertou = resposta === gabaritoDe(q);
            if (!historico[q.id]) {
                historico[q.id] = { acertos: 0, erros: 0, tentativas: 0, ultimaResposta: null, recentes: [] };
            }
            const h = historico[q.id];
            h.tentativas = (h.tentativas || 0) + 1;
            if (acertou) h.acertos = (h.acertos || 0) + 1;
            else h.erros = (h.erros || 0) + 1;
            h.ultimaResposta = acertou ? 'certo' : 'errado';
            h.recentes.push(acertou ? 1 : 0);
            if (h.recentes.length > 5) h.recentes.shift();
            h.ultimaData = Date.now();
        }

        revelar(card, q, resposta);

        porMateria[q.materia] = porMateria[q.materia] || { ok: 0, total: 0 };
        porMateria[q.materia].total++;
        if (resposta === null) brancos++;
        else if (resposta === gabaritoDe(q)) { acertos++; porMateria[q.materia].ok++; }
        else erros++;
    });

    salvarHistorico(historico);
    atualizarPlacar(historico, questoes);

    const total = simulado.ids.length;
    const pct = Math.round((acertos / total) * 100);
    const fracas = Object.keys(porMateria)
        .filter(m => porMateria[m].ok / porMateria[m].total < 0.6)
        .map(m => `${esc(m)} (${porMateria[m].ok}/${porMateria[m].total})`);

    const botaoFinalizar = document.getElementById("btn-finalizar");
    if (botaoFinalizar) botaoFinalizar.parentElement.remove();

    container.insertAdjacentHTML("afterbegin", `
        <div class="resultado-simulado">
            <h3>${porTempo ? "⏱ Tempo esgotado" : "🏁 Simulado finalizado"}</h3>
            <p class="resultado-nota"><strong>${acertos}/${total}</strong> acertos (${pct}%)</p>
            <p>Erros: ${erros} · Em branco: ${brancos} · Tempo gasto: ${formatarTempo(Date.now() - simulado.inicio)}</p>
            ${fracas.length ? `<p>Matérias para reforçar: ${fracas.join(", ")}</p>` : ""}
        </div>`);
    container.scrollTo({ top: 0, behavior: "smooth" });
}