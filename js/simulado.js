// ============================================================
// js/simulado.js - Processamento de Simulados Blindado
// ============================================================

import { formatarTempo, letraDe, gabaritoDe, classificarStatus, atualizarPlacar, revelar } from './ui.js';
import { salvarHistorico } from './storage.js';
import { showToast } from './notifications.js';

let timerInterval = null;

// ---------- CRONÔMETRO ----------
export function iniciarCronometro(minutos, displayElement, onFinishCallback) {
    pararCronometro(displayElement);
    let tempoRestante = minutos * 60;
    displayElement.innerText = formatarTempo(tempoRestante);
    displayElement.classList.add("ativo");

    timerInterval = setInterval(() => {
        tempoRestante--;
        displayElement.innerText = formatarTempo(tempoRestante);

        if (tempoRestante <= 0) {
            pararCronometro(displayElement);
            showToast("O tempo do simulado acabou!", "alerta");
            if (onFinishCallback) onFinishCallback();
        }
    }, 1000);
}

export function pararCronometro(displayElement) {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (displayElement) {
        displayElement.innerText = "00:00";
        displayElement.classList.remove("ativo");
    }
}

// ---------- BOTÃO DE FINALIZAR ----------
export function adicionarBotaoFinalizar(container) {
    const antigo = container.querySelector(".container-finalizar-simulado");
    if (antigo) antigo.remove();

    const div = document.createElement("div");
    div.className = "container-finalizar-simulado";
    div.style.margin = "2rem 0";
    div.style.textAlign = "center";
    div.innerHTML = `
        <button type="button" id="btn-finalizar" class="btn-primary btn-finalizar-simulado">
            🏁 Finalizar Simulado
        </button>
    `;
    container.appendChild(div);
}

// ---------- PROCESSAMENTO E CONTABILIZAÇÃO DE SIMULADO ----------
export function finalizarSimulado(simulado, container, porId, historico, questoes, porTempo = false) {
    if (!simulado || simulado.finalizado) return;
    simulado.finalizado = true;

    const btnFinalizar = document.getElementById("btn-finalizar");
    if (btnFinalizar) {
        btnFinalizar.disabled = true;
        btnFinalizar.innerText = "✓ Simulado Finalizado";
    }

    let acertosSimulado = 0;
    const totalQuestoes = simulado.ids ? simulado.ids.length : 0;
    if (totalQuestoes === 0) return;

    simulado.ids.forEach(id => {
        const idStr = String(id);
        const q = porId.get(idStr);
        if (!q) return;

        const card = container.querySelector(`.questao-card[data-id="${idStr}"]`) || 
                     container.querySelector(`.questao-card[data-id="${q.id}"]`);
        
        // Busca flexível da resposta registrada
        const respostaDada = simulado.respostas[idStr] || simulado.respostas[q.id];
        const temResposta = (respostaDada !== undefined && respostaDada !== null && String(respostaDada).trim() !== "");

        if (card && temResposta) {
            const letraDada = letraDe(respostaDada);
            const gabaritoOficial = gabaritoDe(q);
            const acertou = (letraDada === gabaritoOficial);

            if (!historico[idStr]) {
                historico[idStr] = { acertos: 0, erros: 0, tentativas: 0, ultimaResposta: null, recentes: [] };
            }
            const h = historico[idStr];
            if (!Array.isArray(h.recentes)) h.recentes = [];

            h.tentativas = (h.tentativas || 0) + 1;
            if (acertou) {
                h.acertos = (h.acertos || 0) + 1;
                acertosSimulado++;
            } else {
                h.erros = (h.erros || 0) + 1;
            }

            h.ultimaResposta = acertou ? 'certo' : 'errado';
            h.recentes.push(acertou ? 1 : 0);
            if (h.recentes.length > 5) h.recentes.shift();
            h.ultimaData = Date.now();

            revelar(card, q, letraDada);

            const status = classificarStatus(idStr, historico);
            const badge = card.querySelector(".badge");
            if (badge) {
                badge.className = `badge ${status.classe}`;
                badge.innerText = status.texto;
            }
            const elTentativas = card.querySelector(".tentativas");
            if (elTentativas) elTentativas.innerText = `Tentativas: ${h.tentativas}`;
        } else if (card) {
            const fb = card.querySelector(".feedback-area");
            if (fb) {
                fb.className = "feedback-area feedback neutro";
                fb.innerText = "Questão não respondida.";
            }
        }
    });

    salvarHistorico(historico);
    atualizarPlacar(historico, questoes);

    const taxa = totalQuestoes > 0 ? ((acertosSimulado / totalQuestoes) * 100).toFixed(1) : 0;
    showToast(`Simulado finalizado! Nota: ${acertosSimulado}/${totalQuestoes} (${taxa}%)`, "sucesso");
}