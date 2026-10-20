// ============================================================
// js/simulado.js - Processamento de Simulados Blindado (FocoPro)
// ============================================================

import { formatarTempo, letraDe, gabaritoDe, classificarStatus, atualizarPlacar, revelar } from './ui.js';
import { salvarHistorico } from './storage.js';
import { showToast } from './notifications.js';

// ---------- 1. CONTROLE DO TEMPO E CRONÔMETRO ----------
let timerInterval = null;

export function iniciarCronometro(minutos, displayElement, onFinishCallback) {
    pararCronometro(displayElement);
    if (!displayElement) return;

    let tempoRestante = minutos * 60;
    displayElement.innerText = formatarTempo(tempoRestante);
    displayElement.classList.add("ativo");

    timerInterval = setInterval(() => {
        tempoRestante--;
        if (displayElement) {
            displayElement.innerText = formatarTempo(tempoRestante);
        }

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

// ---------- 2. INJEÇÃO DO BOTÃO DE FINALIZAÇÃO ----------
export function adicionarBotaoFinalizar(container) {
    if (!container) return;
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

// ---------- 3. PROCESSAMENTO E CONTABILIZAÇÃO EM LOTE ----------
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
        
        // Recuperação flexível da resposta registrada no simulado
        const respostaDada = simulado.respostas[idStr] || simulado.respostas[q.id];
        const temResposta = (respostaDada !== undefined && respostaDada !== null && String(respostaDada).trim() !== "");

        if (card && temResposta) {
            const letraDada = letraDe(respostaDada);
            const gabaritoOficial = gabaritoDe(q);
            const acertou = (letraDada === gabaritoOficial);

            if (!historico[idStr]) {
                historico[idStr] = { acertos: 0, erros: 0, tentativas: 0, ultimaResposta: null, recentes: [], status: 'novo' };
            }
            const h = historico[idStr];
            if (!Array.isArray(h.recentes)) h.recentes = [];

            h.tentativas = (h.tentativas || 0) + 1;
            if (acertou) {
                h.acertos = (h.acertos || 0) + 1;
                acertosSimulado++;
                // Transição de status para superado se a questão estava pendente no caderno de erros
                if (h.status === 'erro' || h.ultimaResposta === 'errado') {
                    h.status = 'superado';
                } else {
                    h.status = 'acerto';
                }
            } else {
                h.erros = (h.erros || 0) + 1;
                h.status = 'erro';
            }

            h.ultimaResposta = acertou ? 'certo' : 'errado';
            h.recentes.push(acertou ? 1 : 0);
            if (h.recentes.length > 5) h.recentes.shift();
            h.ultimaData = Date.now();

            // Revela a resposta no DOM e atualiza badge de status
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

    // Atualiza o armazenamento local e redesenha o painel lateral
    salvarHistorico(historico);
    atualizarPlacar(historico, questoes);

    const taxa = totalQuestoes > 0 ? ((acertosSimulado / totalQuestoes) * 100).toFixed(1) : 0;
    const msgTempo = porTempo ? " (Tempo Esgotado)" : "";
    showToast(`Simulado finalizado${msgTempo}! Nota: ${acertosSimulado}/${totalQuestoes} (${taxa}%)`, "sucesso");
}