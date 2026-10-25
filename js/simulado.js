// ============================================================
// js/simulado.js - Processamento de Simulados Blindado (FocoPro)
// ============================================================

import { formatarTempo, gabaritoDe, classificarStatus, atualizarPlacar, revelar } from './ui.js';
import { salvarHistorico, registrarDiaDeEstudo } from './storage.js';
import { salvarRespostasEmLote } from './supabase.js';
import { aplicarResposta, novoRegistro } from './revisao.js';
import { showToast } from './notifications.js';

// ---------- 1. CONTROLE DO TEMPO E CRONÔMETRO ----------
let timerInterval = null;

export function iniciarCronometro(minutos, displayElement, onFinishCallback) {
    pararCronometro(displayElement);
    if (!displayElement) return;

    let tempoRestante = minutos * 60;
    displayElement.hidden = false;
    displayElement.innerText = `⏱️ Tempo Restante: ${formatarTempo(tempoRestante)}`;
    displayElement.classList.add("ativo");

    timerInterval = setInterval(() => {
        tempoRestante--;
        if (displayElement) {
            displayElement.innerText = `⏱️ Tempo Restante: ${formatarTempo(tempoRestante)}`;
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
        displayElement.hidden = true;
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
        <button type="button" id="btn-finalizar-simulado" class="btn-primary btn-finalizar-simulado">
            🏁 Finalizar Simulado e Ver Resultado
        </button>
    `;
    container.appendChild(div);
}

// ---------- 3. PROCESSAMENTO E CONTABILIZAÇÃO EM LOTE ----------
export function finalizarSimulado(simulado, container, porId, historico, questoes, porTempo = false) {
    if (!simulado || simulado.finalizado) return;
    simulado.finalizado = true;

    const btnFinalizar = document.getElementById("btn-finalizar-simulado") || document.getElementById("btn-finalizar");
    if (btnFinalizar) {
        btnFinalizar.disabled = true;
        btnFinalizar.innerText = "✓ Simulado Finalizado";
    }

    let acertosSimulado = 0;
    const respostasParaNuvem = [];
    const totalQuestoes = simulado.ids ? simulado.ids.length : 0;
    if (totalQuestoes === 0) return;

    simulado.ids.forEach(id => {
        const idStr = String(id);
        const q = porId.get(idStr);
        if (!q) return;

        const card = container.querySelector(`.card-questao[data-id="${CSS.escape(idStr)}"]`);

        // Verifica resposta registrada ou radio marcado diretamente no card
        const radioMarcado = card ? card.querySelector(".radio-opcao:checked") : null;
        const respostaDada = simulado.respostas[idStr] || simulado.respostas[q.id] || (radioMarcado ? radioMarcado.value : null);
        const temResposta = (respostaDada !== undefined && respostaDada !== null && String(respostaDada).trim() !== "");

        if (card && temResposta) {
            const letraDada = String(respostaDada).trim().toUpperCase();
            const gabaritoOficial = gabaritoDe(q);
            const acertou = (letraDada === gabaritoOficial);

            const confianca = (simulado.confiancas && simulado.confiancas[idStr]) || 'certeza';
            if (acertou) acertosSimulado++;

            if (!historico[idStr]) historico[idStr] = novoRegistro();
            const h = historico[idStr];
            aplicarResposta(h, { acertou, confianca, momento: Date.now(), letra: letraDada });
            registrarDiaDeEstudo();
            respostasParaNuvem.push({
                questaoId: idStr,
                materia: q.materia || 'Geral',
                banca: q.banca || 'Não informada',
                acertou,
                respostaEscolhida: letraDada,
                momento: h.ultimaData,
                confianca
            });

            revelar(card, q, letraDada, { confianca });

            const status = classificarStatus(idStr, historico);
            const badge = card.querySelector(".badge");
            if (badge) {
                badge.className = `badge ${status.classe}`;
                badge.innerText = status.texto;
            }
            const elTentativas = card.querySelector(".tentativas");
            if (elTentativas) elTentativas.innerText = `Tentativas: ${h.tentativas}`;
        } else if (card) {
            revelar(card, q, null);
        }
    });

    salvarHistorico(historico);
    atualizarPlacar(historico, questoes);

    // Antes, as respostas do simulado ficavam só neste aparelho
    salvarRespostasEmLote(respostasParaNuvem);

    const taxa = totalQuestoes > 0 ? ((acertosSimulado / totalQuestoes) * 100).toFixed(1) : 0;
    const msgTempo = porTempo ? " (Tempo Esgotado)" : "";
    showToast(`Simulado finalizado${msgTempo}! Nota: ${acertosSimulado}/${totalQuestoes} (${taxa}%)`, "sucesso", 5000);
}