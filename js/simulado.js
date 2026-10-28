// ============================================================
// js/simulado.js - Processamento de Simulados Blindado (FocoPro)
// ============================================================

import { formatarTempo, classificarStatus, atualizarPlacar, revelar } from './ui.js';
import { salvarHistorico, registrarDiaDeEstudo } from './storage.js';
import { salvarRespostasEmLote, corrigirResposta } from './supabase.js';
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
// Assíncrona (U9): o gabarito de cada questão só vem do servidor na hora de finalizar,
// corrigido via RPC — nenhuma questão do simulado leva o gabarito consigo antes disso.
export async function finalizarSimulado(simulado, container, porId, historico, questoes, porTempo = false) {
    if (!simulado || simulado.finalizado) return;
    simulado.finalizado = true;

    const btnFinalizar = document.getElementById("btn-finalizar-simulado") || document.getElementById("btn-finalizar");
    if (btnFinalizar) {
        btnFinalizar.disabled = true;
        btnFinalizar.innerText = "Corrigindo...";
    }

    const totalQuestoes = simulado.ids ? simulado.ids.length : 0;
    if (totalQuestoes === 0) return;

    // 1ª passada: reúne o que cada questão tem (respondida ou não) sem corrigir ainda
    const itens = simulado.ids.map(id => {
        const idStr = String(id);
        const q = porId.get(idStr);
        if (!q) return null;

        const card = container.querySelector(`.card-questao[data-id="${CSS.escape(idStr)}"]`);
        const radioMarcado = card ? card.querySelector(".radio-opcao:checked") : null;
        const respostaDada = simulado.respostas[idStr] || simulado.respostas[q.id] || (radioMarcado ? radioMarcado.value : null);
        const temResposta = (respostaDada !== undefined && respostaDada !== null && String(respostaDada).trim() !== "");
        return { idStr, q, card, temResposta, letraDada: temResposta ? String(respostaDada).trim().toUpperCase() : null };
    }).filter(Boolean);

    // Corrige todas de uma vez, em paralelo (mesmo as não respondidas, só pra revelar o
    // gabarito delas no resultado). Corrigir é só leitura no servidor: nada foi salvo ainda.
    let falhaDeConexao = false;
    const correcoes = await Promise.all(itens.map(async it => {
        try {
            return await corrigirResposta(it.q, it.letraDada || "");
        } catch (erro) {
            console.warn(`[FocoPro] Não foi possível corrigir a questão ${it.idStr} agora:`, erro.message);
            if (!erro.semGabarito) falhaDeConexao = true;
            return null;
        }
    }));

    // Tudo ou nada: com falha de conexão, não aplica nenhuma correção (nota pela metade
    // seria enganosa). Respostas e marcações continuam na tela; dá pra tentar de novo.
    if (falhaDeConexao) {
        simulado.finalizado = false;
        // Tempo esgotado: trava as marcações, pra não dar pra mudar resposta enquanto espera
        if (porTempo) container.querySelectorAll(".radio-opcao").forEach(r => { r.disabled = true; });
        if (btnFinalizar) {
            btnFinalizar.disabled = false;
            btnFinalizar.innerText = "🔁 Tentar corrigir de novo";
        }
        showToast("Sem conexão com o servidor para corrigir o simulado. Suas respostas continuam aqui — confira a internet e toque em \"Tentar corrigir de novo\".", "erro", 8000);
        return;
    }

    let acertosSimulado = 0;
    let falhasDeCorrecao = 0; // só questões sem gabarito cadastrado (problema do dado)
    const respostasParaNuvem = [];

    itens.forEach((it, i) => {
        const { idStr, q, card, temResposta, letraDada } = it;
        const resultado = correcoes[i];

        if (!resultado) {
            falhasDeCorrecao++;
            return; // sem gabarito: não pinta nada como certo
        }

        q.gabarito = resultado.gabarito; // fica em memória pra qualquer novo render usar

        if (card && temResposta) {
            const acertou = resultado.acertou;
            const confianca = (simulado.confiancas && simulado.confiancas[idStr]) || 'certeza';
            if (acertou) acertosSimulado++;

            if (!historico[idStr]) historico[idStr] = novoRegistro();
            const h = historico[idStr];
            aplicarResposta(h, { acertou, confianca, momento: Date.now(), letra: letraDada });
            h.gabaritoRevelado = resultado.gabarito; // sobrevive ao F5 e viaja pra nuvem (U9)
            registrarDiaDeEstudo();
            respostasParaNuvem.push({
                questaoId: idStr,
                materia: q.materia || 'Geral',
                banca: q.banca || 'Não informada',
                acertou,
                respostaEscolhida: letraDada,
                momento: h.ultimaData,
                confianca,
                gabarito: resultado.gabarito
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

    if (btnFinalizar) btnFinalizar.innerText = "✓ Simulado Finalizado";

    const taxa = totalQuestoes > 0 ? ((acertosSimulado / totalQuestoes) * 100).toFixed(1) : 0;
    const msgTempo = porTempo ? " (Tempo Esgotado)" : "";
    const avisoFalhas = falhasDeCorrecao > 0
        ? ` (${falhasDeCorrecao} questão${falhasDeCorrecao > 1 ? "ões" : ""} sem gabarito cadastrado, fora da correção)`
        : "";
    showToast(`Simulado finalizado${msgTempo}! Nota: ${acertosSimulado}/${totalQuestoes} (${taxa}%)${avisoFalhas}`, "sucesso", 6000);
}